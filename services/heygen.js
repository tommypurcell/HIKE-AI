// HeyGen Service - Handles avatar video generation

const HEYGEN_API_BASE_URL = 'https://api.heygen.com';

// Get API key from environment variable (Vite uses import.meta.env)
function getHeyGenApiKey() {
    return import.meta.env.VITE_HEYGEN_API_KEY;
}

// Avatar configurations for team mascots
const AVATARS = {
  eagles: {
    id: '8844b93031c74385b4582184740ad287',
    name: 'Swoop',
    team: 'Philadelphia Eagles'
  },
  chiefs: {
    id: '99b680f78a1d495fbd4d010dde4b1134',
    name: 'KC Wolf',
    team: 'Kansas City Chiefs'
  }
};

/**
 * Generate a video with the specified avatar and script
 * @param {string} teamKey - Key for the team avatar ('eagles' or 'chiefs')
 * @param {string} script - Text script for the avatar to narrate
 * @param {Object} options - Additional options for video generation
 * @returns {Promise<Object>} - Response containing video_id
 */
export async function generateVideo(teamKey, script, options = {}) {
  const HEYGEN_API_KEY = getHeyGenApiKey();
  if (!HEYGEN_API_KEY) {
    throw new Error('VITE_HEYGEN_API_KEY is not configured in environment variables');
  }

  const avatar = AVATARS[teamKey];
  if (!avatar) {
    throw new Error(`Invalid team key: ${teamKey}. Available: eagles, chiefs`);
  }

  // Allow override of avatar_id for testing purposes
  const avatarId = options.avatarId || avatar.id;

  const requestBody = {
    caption: options.caption || false,
    video_inputs: [{
      character: {
        type: 'avatar',
        avatar_id: avatarId,
        avatar_style: options.avatarStyle || 'normal',
        scale: options.scale || 1,
        talking_style: options.talkingStyle || 'stable'
      },
      voice: {
        type: 'text',
        input_text: script,
        voice_id: options.voiceId || '1lDUIWe5fg9DMHWxzeSk', // Hype Man Sporty - perfect for sports!
        speed: options.speed || '1',
        pitch: options.pitch || '0'
      },
      background: {
        type: 'color',
        value: options.backgroundColor || '#FFFFFF',
        play_style: options.playStyle || 'freeze',
        fit: options.fit || 'cover'
      }
    }],
    dimension: {
      width: options.width || 1280,
      height: options.height || 720
    },
    test: options.test || false,
    title: options.title || `${avatar.name} - Halftime Analysis`
  };

  try {
    const response = await fetch(`${HEYGEN_API_BASE_URL}/v2/video/generate`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': HEYGEN_API_KEY
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Full API response:', JSON.stringify(data, null, 2));
      throw new Error(`HeyGen API error: ${data.message || JSON.stringify(data) || response.statusText}`);
    }

    console.log(`✅ Video generation started for ${avatar.name}`);
    console.log(`Video ID: ${data.data.video_id}`);

    return data.data;
  } catch (error) {
    console.error('Error generating video:', error);
    throw error;
  }
}

/**
 * Check the status of a video generation job
 * @param {string} videoId - The video ID returned from generateVideo
 * @returns {Promise<Object>} - Video status information
 */
export async function getVideoStatus(videoId) {
  const HEYGEN_API_KEY = getHeyGenApiKey();
  if (!HEYGEN_API_KEY) {
    throw new Error('VITE_HEYGEN_API_KEY is not configured in environment variables');
  }

  try {
    const response = await fetch(
      `${HEYGEN_API_BASE_URL}/v1/video_status.get?video_id=${videoId}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': HEYGEN_API_KEY
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HeyGen API error: ${data.message || response.statusText}`);
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching video status:', error);
    throw error;
  }
}

/**
 * Poll for video completion and return the final video URL
 * @param {string} videoId - The video ID to poll
 * @param {number} maxAttempts - Maximum number of polling attempts (default: 60)
 * @param {number} intervalMs - Polling interval in milliseconds (default: 5000)
 * @returns {Promise<Object>} - Final video information with URL
 */
export async function waitForVideoCompletion(videoId, maxAttempts = 60, intervalMs = 5000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await getVideoStatus(videoId);

    console.log(`Polling attempt ${attempt + 1}/${maxAttempts} - Status: ${status.status}`);

    if (status.status === 'completed') {
      console.log('✅ Video generation completed!');
      console.log(`Video URL: ${status.video_url}`);
      return status;
    }

    if (status.status === 'failed') {
      throw new Error(`Video generation failed: ${status.error || 'Unknown error'}`);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error('Video generation timeout - maximum polling attempts reached');
}

/**
 * Get available avatar configurations (local config)
 * @returns {Object} - Avatar configurations
 */
export function getAvailableAvatars() {
  return AVATARS;
}

/**
 * List all avatars available in your HeyGen account
 * @returns {Promise<Object>} - List of available avatars from HeyGen API
 */
export async function listHeyGenAvatars() {
  const HEYGEN_API_KEY = getHeyGenApiKey();
  if (!HEYGEN_API_KEY) {
    throw new Error('VITE_HEYGEN_API_KEY is not configured in environment variables');
  }

  try {
    const response = await fetch(`${HEYGEN_API_BASE_URL}/v2/avatars`, {
      method: 'GET',
      headers: {
        'x-api-key': HEYGEN_API_KEY
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HeyGen API error: ${data.message || response.statusText}`);
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching avatars:', error);
    throw error;
  }
}

/**
 * List all voices available in your HeyGen account
 * @returns {Promise<Object>} - List of available voices from HeyGen API
 */
export async function listHeyGenVoices() {
  const HEYGEN_API_KEY = getHeyGenApiKey();
  if (!HEYGEN_API_KEY) {
    throw new Error('VITE_HEYGEN_API_KEY is not configured in environment variables');
  }

  try {
    const response = await fetch(`${HEYGEN_API_BASE_URL}/v2/voices`, {
      method: 'GET',
      headers: {
        'x-api-key': HEYGEN_API_KEY
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HeyGen API error: ${data.message || response.statusText}`);
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching voices:', error);
    throw error;
  }
}

/**
 * Full workflow: Generate video and wait for completion
 * @param {string} teamKey - Key for the team avatar ('eagles' or 'chiefs')
 * @param {string} script - Text script for the avatar to narrate
 * @param {Object} options - Additional options for video generation
 * @returns {Promise<Object>} - Completed video information with URL
 */
export async function generateAndWaitForVideo(teamKey, script, options = {}) {
  const generateResponse = await generateVideo(teamKey, script, options);
  const videoId = generateResponse.video_id;

  console.log(`⏳ Waiting for video generation to complete...`);
  const completedVideo = await waitForVideoCompletion(videoId);

  return {
    videoId,
    videoUrl: completedVideo.video_url,
    duration: completedVideo.duration,
    status: completedVideo.status,
    thumbnail: completedVideo.thumbnail_url
  };
}

/**
 * Download video from HeyGen URL (browser version - triggers download)
 * @param {string} videoUrl - The video URL from HeyGen
 * @param {string} filename - Filename for the download
 * @returns {Promise<void>}
 */
export async function downloadVideo(videoUrl, filename = 'video.mp4') {
  try {
    const response = await fetch(videoUrl);

    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    console.log(`✅ Video download started: ${filename}`);
  } catch (error) {
    console.error('Error downloading video:', error);
    throw error;
  }
}
