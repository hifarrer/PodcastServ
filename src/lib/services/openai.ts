import OpenAI from 'openai';
import { ScriptGenerationOptions, ScriptResult } from '@/lib/types';
import { logWithTimestamp } from '@/lib/utils';

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}


export async function generateScript(
  prompt: string, 
  options: ScriptGenerationOptions
): Promise<ScriptResult> {
  logWithTimestamp('Starting script generation', { prompt: prompt.substring(0, 100) + '...', options });
  
  const systemPrompt = `You are an expert podcast script writer. Generate a professional podcast script based on the user's prompt and requirements.

The script should be structured with:
1. A compelling title
2. SSML (Speech Synthesis Markup Language) formatted content with proper pacing, breaks, and emphasis
3. Chapter markers for navigation
4. Show notes in markdown format
5. Speaker turns for dialogue (if applicable)
6. 30-second segment breakdowns for video generation

Script Modes:
- SUMMARY: Condensed overview of the source material
- READTHROUGH: Full content presentation with natural flow
- DISCUSSION: Two-speaker dialogue with opposing viewpoints

Return ONLY a valid JSON object with this exact structure:
{
  "title": "Episode Title",
  "ssml": "<speak>...</speak>",
  "chapters": [{"title":"Chapter Title","hint":"Chapter description"}],
  "show_notes": "Markdown content",
  "estimated_wpm": 150,
  "speaker_names": {"A": "Speaker A Name", "B": "Speaker B Name"},
  "turns": [{"speaker": "A", "text": "Speaker text"}],
  "parts30s": {"1": "First 30s content", "2": "Second 30s content"}
}`;

  const userPrompt = `Create a ${options.mode.toLowerCase()} podcast script about: ${prompt}

Requirements:
- Target duration: ${options.targetMinutes || 5} minutes
- Language: ${options.language}
- Style: ${options.style}
- Two speakers: ${options.twoSpeakers ? 'Yes' : 'No'}
${options.twoSpeakers ? `- Speaker A: ${options.speakerNameA || 'Host'}` : ''}
${options.twoSpeakers ? `- Speaker B: ${options.speakerNameB || 'Co-host'}` : ''}
- Generate video: ${options.generateVideo ? 'Yes' : 'No'}

Make the content engaging, informative, and suitable for audio presentation.`;

  try {
    logWithTimestamp('Calling OpenAI API');
    const startTime = Date.now();
    const openai = getOpenAI();
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const duration = Date.now() - startTime;
    logWithTimestamp(`OpenAI API call completed in ${duration}ms`);

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    logWithTimestamp('Parsing OpenAI response', { responseLength: responseText.length });
    
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in OpenAI response');
    }

    const scriptResult = JSON.parse(jsonMatch[0]) as ScriptResult;
    logWithTimestamp('Script generation completed successfully', { 
      title: scriptResult.title,
      chapters: scriptResult.chapters.length,
      turns: scriptResult.turns.length,
      parts30s: Object.keys(scriptResult.parts30s).length
    });

    return scriptResult;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logWithTimestamp('OpenAI API failed', { error: errorMessage });
    throw new Error(`Script generation failed: ${errorMessage}`);
  }
}
