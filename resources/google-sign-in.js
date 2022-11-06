const client = google.accounts.oauth2.initCodeClient({
  client_id: "190836595018-t97kk6shg0u7in2jf86gklffmj6ec6bq.apps.googleusercontent.com",
  scope: "https://www.googleapis.com/auth/spreadsheets",
  ux_mode: "popup",
  callback: (response) => {
    fetch("./set-credentials", {
      method: "POST",
      body: JSON.stringify({ code: response.code }),
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "javascript-fetch",
      },
    })
      .then((res) => {
        console.log(1)
        window.location.href="./dashboard"
      })
  },
});

client.requestCode();
