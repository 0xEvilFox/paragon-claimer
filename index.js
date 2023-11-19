const axios = require('axios');
const readlineSync = require('readline-sync');

async function getUserId(userProviderAddress) {
  const userApiUrl = 'https://api-prod.theparagon.co/user/gamePlayer';

  try {
    const response = await axios.get(userApiUrl, {
      params: {
        userProviderAddress,
      },
    });

    const userId = response.data.result.id;
    return userId;
  } catch (error) {
    console.error('Error fetching user data:', error.message);
    throw error;
  }
}

async function formatTime(milliseconds) {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

  return `${hours} hours, ${minutes} minutes, ${seconds} seconds`;
}

async function checkNextGameTime(userId, userProviderAddress) {
  const apiUrl = `https://api-prod.theparagon.co/seek_lite/next_game_time/${userId}`;
  const playApiUrl = 'https://api-prod.theparagon.co/seek_lite/play';
  const refetchInterval = 14345535;

  try {
    const response = await axios.get(apiUrl, {
      params: {
        userProviderAddress,
        refetchInterval,
      },
    });

    const { next_game_time } = response.data;
    console.log(`Next game time from API: ${next_game_time}`);

    // Compare with the current time
    const currentTime = new Date().toISOString();
    const timeRemaining = new Date(next_game_time) - new Date();

    console.log(`Time remaining until next game: ${await formatTime(timeRemaining)}`);

    // Send a POST request to play API if time remaining is negative
    if (timeRemaining < 0) {
      console.log('The next game time has already passed. Sending a POST request to play API...');

      const playResponse = await axios.post(playApiUrl, {
        player_id: userId,
      });

      // Check if the play request was successful
      if (playResponse.status === 200) {
        console.log('Play request successful. Result:', playResponse.data);

        // Introduce a 10-second delay before making the next request
        console.log('Sleeping for 10 seconds...');
        await sleep(10000);

        // Recursive call to keep the loop after a successful play request
        checkNextGameTime(userId, userProviderAddress);
      } else {
        console.error('Error making play request:', playResponse.data);
      }
    } else {
      console.log('The next game time is still in the future. Sleeping until the next game time...');

      // Sleep for the remaining time
      setTimeout(() => checkNextGameTime(userId, userProviderAddress), timeRemaining);
    }
  } catch (error) {
    console.error('Error fetching or processing data:', error.message);
  }
}

// Function to initiate the loop
async function startLoop() {
  // Get userProviderAddress from the user
  const userProviderAddress = readlineSync.question('Enter the userProviderAddress (wallet address): ');

  // Get userId from the provided endpoint
  const userId = await getUserId(userProviderAddress);
  console.log(`User ID: ${userId}`);

  // Call the function to check the next game time
  checkNextGameTime(userId, userProviderAddress);
}

// Helper function for sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Start the loop
startLoop().catch(error => {
  console.error('Failed to start the loop:', error.message);
});
