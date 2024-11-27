import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import { Document } from "@langchain/core/documents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import "cheerio";
import fs from "fs";
import { pull } from "langchain/hub";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { formatDocumentsAsString } from "langchain/util/document";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { sleep } from "radash";

async function processScrapedData(documents: Document[]) {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });

  const split = await textSplitter.splitDocuments(documents);
  return textSplitter.splitDocuments(split);
}

async function scrapeWithPagination(
  initialUrl: string,
  nextPageSelector: string,
  maxPages: number = 20
): Promise<Document[]> {
  const documents: Document[] = [];
  let currentPage = 0;
  let currentUrl = initialUrl;

  while (currentPage < maxPages) {
    const loader = new PuppeteerWebBaseLoader(currentUrl, {
      launchOptions: { headless: true },
      gotoOptions: { waitUntil: "domcontentloaded", timeout: 1_000_000 },
      evaluate: async (page) => {
        const content = await page.content();
        await page.setRequestInterception(true);

        const rows = await page.evaluate(() => {
          return Array.from(
            Array.from(document.querySelectorAll("tr.Item")),
            (i) => i.id
          );
        });

        const inputs = await page.evaluate(() => {
          return Array.from(
            Array.from(document.querySelectorAll('input[type="checkbox"]')),
            (i) => i.id
          );
        });

        page.on("response", async (response) => {
          const url = response.url();
          const contentType = response.headers()["content-type"];

          // Check if the response is a PDF
          if (contentType === "application/pdf") {
            console.log(`PDF detected: ${url}`);

            // Download and save the PDF
            const pdfBuffer = await response.buffer();
            fs.writeFileSync("downloaded.pdf", pdfBuffer);
            // console.log("PDF downloaded and saved as downloaded.pdf");
          }
        });

        // Two different tests, click easch row, then check for the popup element
        // Next test is to click and hover over each input. Again needed to actually find what element triggers the popup.
        for (const r of rows) {
          await page.click(`#${r}`);
          await sleep(1_000);
          const element = await page.$(`.QueryPopup > a`);
          if (element) {
            await page.click(`.QueryPopup > a`);
            await sleep(5_000);
          }
        }

        for (const i of inputs) {
          await page.click(`#${i}`);
          await page.hover(`#${i}`);

          const element = await page.$(`.QueryPopup > a`);
          if (element) {
            await page.click(`.QueryPopup > a`);
            await sleep(5_000);
          }
        }

        const nextPageElement = await page.$(nextPageSelector);

        if (nextPageElement) {
          await page.click(nextPageSelector);
        }
        return content;
      },
    });

    const docs = await loader.load();
    // @ts-ignore
    documents.push(...docs);

    if (!currentUrl) break;
    currentPage++;
  }

  return documents;
}

export async function POST(req: Request) {
  const { messages } = await req.json();

  const docs = await scrapeWithPagination(
    "https://www.library.mto.gov.on.ca/SydneyPLUS/TechPubs/Portal/tp/opsViews.aspx",
    "a.NextPrev"
  );

  const splits = await processScrapedData(docs);
  const vectorStore = await MemoryVectorStore.fromDocuments(
    splits,
    new OpenAIEmbeddings()
  );

  // // Retrieve and generate using the relevant snippets of the blog.
  const retriever = vectorStore.asRetriever();
  const prompt = await pull<ChatPromptTemplate>("rlm/rag-prompt");
  const llm = new ChatOpenAI({ model: "gpt-4-turbo", temperature: 0 });

  const declarativeRagChain = RunnableSequence.from([
    {
      context: retriever.pipe(formatDocumentsAsString),
      question: new RunnablePassthrough(),
    },
    prompt,
    llm,
    new StringOutputParser(),
  ]);

  const response = await declarativeRagChain.invoke(
    "What is Ontario Provincial Standards?"
  );

  return response;

  // return new Response("Hello world");
}
