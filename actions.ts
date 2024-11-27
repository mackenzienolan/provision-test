"use server";

export async function getChatResponse(message: string) {
  // Simulate a delay to mimic API call
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Simple response logic
  const response = `You said: "${message}". This is a simulated response.`;

  return response;
}
