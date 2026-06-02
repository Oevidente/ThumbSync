import https from 'https';

https.get('https://raw.githubusercontent.com/Oevidente/GastosMax-Disney/main/sw.js', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => { 
    if (data.includes('fetch')) {
      console.log('Contains fetch');
    } else {
      console.log('Does NOT contain fetch');
    }
  });
}).on("error", (err) => { console.log("Error: " + err.message); });
