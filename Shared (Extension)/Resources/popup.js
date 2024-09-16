function setUserId(id) {
    const span = document.getElementById("user-id");
    span.innerText = id;
}

const getVideoId = () => document.querySelector(".video-input")?.value;
function fetchVideoInfo(videoId) {
    fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`)
        .then((res) =>
            res
                .json()
                .then((json) => {
                    if (!isCurrentVideo(videoId)) {
                        return;
                    }
                    setLikes(json.likes, json.dislikes)
                })
                .catch(console.error),
        )
        .catch(console.error);
}

function setLikes(likes, dislikes) {
    const vidInfo = document.querySelector(".video-info");
    const like = vidInfo.querySelector(".like");
    const dislike = vidInfo.querySelector(".dislike");
    
    like.innerText = likes ?? "";
    dislike.innerText = dislikes ?? "";
}

function isCurrentVideo(videoId) {
    const vidInfo = document.querySelector(".video-info");
    return videoId == vidInfo.dataset.video;
}

function getVideoInfo(e) {
    const videoId = getVideoId();

    const vidInfo = document.querySelector(".video-info");
    const image = vidInfo.querySelector("img");
    if (image) {
        image.src = `https://i3.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    }

    vidInfo.classList.remove("hidden");
    vidInfo.dataset.video = videoId;
    fetchVideoInfo(videoId);
    setLikes(0,0)
}

browser.runtime
    .sendNativeMessage("application.id", { type: "get-id" })
    .then((response) => {
        setUserId(response.data ?? "None");
    })
    .catch((error) => {
        console.error("Error communicating with native app: ", error);
    });

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("video-submit").addEventListener("click", getVideoInfo);
});
