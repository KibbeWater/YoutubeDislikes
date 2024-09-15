function setUserId(id) {
    const span = document.getElementById("user-id")
    span.innerText = id
}

browser.runtime.sendNativeMessage("application.id", {type: 'get-id'})
    .then((response) => {
        setUserId(response.data ?? "None");
    })
    .catch((error) => {
        console.error("Error communicating with native app: ", error);
    });
