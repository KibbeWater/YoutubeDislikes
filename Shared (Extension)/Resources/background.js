function sendMessageToNativeApp(message) {
    return new Promise((resolve, reject) => {
        browser.runtime.sendNativeMessage("application.id", message)
            .then((response) => {
                console.log(response)
                resolve(response);
            })
            .catch((error) => {
                console.error("Error communicating with native app: ", error);
                reject(error);
            });
    });
}

const sendSuccess = (data) => Promise.resolve({ success: true, data })
const sendError = (error) => Promise.resolve({ success: false, error })

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Received browser request: ", request);
    const {type, data} = request
    
    if (type === undefined) {
      return sendError("Invalid request shape, missing request type")  
    }
    
    switch (type) {
        case 'vote':
            const { videoId, rating } = data
            
            if (!videoId || rating === undefined) {
                return sendError("Missing required data")
            }
            
            if (typeof videoId !== "string" || typeof rating !== "number") {
                return sendError("Invalid type in data parameters")
            }
            
            return sendMessageToNativeApp({ type: 'vote', data: { videoId, rating } })
        case 'register':
            return sendMessageToNativeApp({ type: 'register' })
        case 'echo':
            return sendSuccess(data)
        default:
            console.error("Invalid request type entered")
            break;
    }
});
