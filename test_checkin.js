
async function test() {
  const url = 'https://script.google.com/macros/s/AKfycbwMxsEB3x68jm1qzJ6_Asir8JWin01IDgJLU8bXhSOhCbE0xIzJSS2zqT485ThgUGnHuA/exec?action=checkin&teamId=SYN26-ALGT-ZLVD&teamName=tfyghjnk&leaderName=ftyguhjnk&organizerName=AutomatedTest';
  console.log('Fetching:', url);
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const text = await res.text();
    console.log('Response:', text);
  } catch (e) {
    console.error('Error:', e);
  }
}
test();

