import axios, { AxiosError } from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Define a type for the API response to help with type safety
interface AiResponseChoice {
  message: {
    content: string;
  };
}

interface AiResponseData {
  choices: AiResponseChoice[];
  error?: { message: string }; // In case the API returns an error structure
}

const conversationHistory: { role: string; content: string; }[] = [];
const MAX_TOKENS = 128000; // Updated for GPT-4o which supports much higher limits

const estimateTokens = (messages: { role: string; content: string; }[]): number => {
  return messages.reduce((total, message) => total + (message.content.length / 4), 0); // Rough estimate
};

const trimConversationHistory = () => {
  while (estimateTokens(conversationHistory) > (MAX_TOKENS - 500)) { // Leave room for response
    conversationHistory.shift(); // Remove the oldest message
  }
};

const sendOpenAi = async (aiPrompt: string, openAiApiKey: string): Promise<string | null> => {
  const notify = (message: string | number | boolean | null | undefined) => toast(message);

  if (!openAiApiKey) {
    const errorMessage = 'OpenAI API Key is missing. Please add it in the Account settings.';
    notify(errorMessage);
    throw new Error(errorMessage);  // Throw an error when API key is missing
  }

  const apiUrl = 'https://api.openai.com/v1/chat/completions';
  trimConversationHistory();
  conversationHistory.push({ role: 'user', content: aiPrompt });

  const requestData = {
    model: 'gpt-4o',
    messages: conversationHistory,
    temperature: 0.3, // More focused for match analysis
    max_tokens: 2000, // Increased for more detailed responses
    stream: true, // Enable streaming for real-time responses
  };

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${openAiApiKey}`,
  };

  try {
    // Handle streaming response
    if (requestData.stream) {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorMessage = `Failed to fetch AI. Status code: ${response.status}`;
        notify(errorMessage);
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                conversationHistory.push({ role: 'assistant', content: fullResponse });
                console.log('aiResponseContent', fullResponse);
                return fullResponse;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.choices?.[0]?.delta?.content) {
                  const content = parsed.choices[0].delta.content;
                  fullResponse += content;
                  // You could emit progress updates here if needed
                }
              } catch (e) {
                console.log('Error parsing JSON:', e); 
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        }
      }
    } else {
      // Fallback to non-streaming for compatibility
      const aiResponse = await axios.post<AiResponseData>(apiUrl, requestData, { headers });

      if (aiResponse.status === 200) {
        const aiResponseContent = aiResponse.data.choices[0].message.content;
        conversationHistory.push({ role: 'assistant', content: aiResponseContent });
        console.log('aiResponseContent', aiResponseContent);
        return aiResponseContent;
      } else {
        const errorMessage = `Failed to fetch AI. Status code: ${aiResponse.status}`;
        notify(errorMessage);
        throw new Error(errorMessage);
             }
     }
     
     // Fallback return if streaming fails
     return null;
   } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<AiResponseData>; // Ensure that error response type is AiResponseData
      const errorMessage = axiosError.response?.data?.error?.message || 'An unknown error occurred while fetching AI.';
      notify(errorMessage);
      throw new Error(errorMessage);  // Throw the error message
    } else {
      const errorMessage = 'An unexpected error occurred.';
      notify(errorMessage);
      throw new Error(errorMessage);  // Handle unexpected errors
    }
  }
};

export default sendOpenAi;
