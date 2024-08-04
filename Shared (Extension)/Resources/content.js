const prfx = "Youtube Dislikes"
const cLog = (txt) => console.log(`[${prfx}] ${txt}`)
const cErr = (txt) => console.error(`[${prfx}] ${txt}`)

/*
 Source:
 https://github.com/Anarios/return-youtube-dislike
 */
function numberFormat(numberState) {
  return getNumberFormatter().format(numberState);
}

/*
 Source:
 https://github.com/Anarios/return-youtube-dislike
 */
function getNumberFormatter() {
  let userLocales;
  if (document.documentElement.lang) {
    userLocales = document.documentElement.lang;
  } else if (navigator.language) {
    userLocales = navigator.language;
  } else {
    try {
      userLocales = new URL(
        Array.from(document.querySelectorAll("head > link[rel='search']"))
          ?.find((n) => n?.getAttribute("href")?.includes("?locale="))
          ?.getAttribute("href"),
      )?.searchParams?.get("locale");
    } catch {
      cLog("Cannot find browser locale. Use en as default for number formatting.");
      userLocales = "en";
    }
  }

  const formatter = Intl.NumberFormat(userLocales, {
    notation: "standard",
    compactDisplay: "short",
  });
  return formatter;
}

const isMobile = () => window.location.host == "m.youtube.com";

const _buttonHost = () => isMobile() ? document.querySelector(".YtSegmentedLikeDislikeButtonViewModelHost") : document.querySelector("#top-level-buttons-computed")
const _likeHost = () => _buttonHost()?.querySelector(".YtLikeButtonViewModelHost")
const _dislikeHost = () => _buttonHost()?.querySelector(".YtDislikeButtonViewModelHost")
function getDislikeButton() {
    return _dislikeHost()?.querySelector("button");
}
function getLikeButton() {
    return _likeHost()?.querySelector("button");
}

function getVideoId() {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get("v");
}

const STATE_LIKED = "liked";
const STATE_DISLIKED = "disliked"
const STATE_NOTLIKED = "none";
let likeState = STATE_NOTLIKED;
function updateLikedState() {
    const likeButton = getLikeButton();
    const dislikeButton = getDislikeButton();
    if (!likeButton && !dislikeButton) return;
    
    const isLiked = likeButton.ariaPressed === "true"
    const isDisliked = dislikeButton.ariaPressed === "true"
    cLog(`${isLiked} ${isDisliked}`)
    
    if (isLiked && isDisliked) return; // What the fuck?
    if (isLiked) likeState = STATE_LIKED;
    else if (isDisliked) likeState = STATE_DISLIKED;
    else likeState = STATE_NOTLIKED
}

const API_URL = "https://returnyoutubedislikeapi.com";
let videoData;
async function fetchStatus() {
    const videoId = getVideoId();
    const res = await fetch(`${API_URL}/votes?videoId=${videoId}`);
    videoData = await res.json();
    updateCount();
}

function updateCount() {
    let addCount = likeState === STATE_DISLIKED ? 1 : 0;
    if (videoData) _updateDislikes(numberFormat(videoData.dislikes + addCount));
}

function _updateDislikes(dislikeText) {
    const dislikeBtn = getDislikeButton();
    if (!dislikeBtn) return;
    
    if (dislikeBtn.querySelector(".yt-spec-button-shape-next__button-text-content")) return;
    
    dislikeBtn.classList.remove("yt-spec-button-shape-next--icon-button")
    dislikeBtn.classList.add("yt-spec-button-shape-next--icon-leading")
    
    const textDiv = document.createElement("div");
    textDiv.classList.add("yt-spec-button-shape-next__button-text-content")
    textDiv.appendChild(document.createTextNode(dislikeText))
    dislikeBtn.insertBefore(textDiv, dislikeBtn.childNodes[2]);
}

function dislikeClicked() {
    updateLikedState();
    updateCount();
}

function likeClicked() {
    updateLikedState();
    updateCount();
}

/*
 Source:
 https://github.com/Anarios/return-youtube-dislike
 */
function createObserver(options, callback) {
  const observerWrapper = new Object();
  observerWrapper.options = options;
  observerWrapper.observer = new MutationObserver(callback);
  observerWrapper.observe = function (element) {
    this.observer.observe(element, this.options);
  };
  observerWrapper.disconnect = function () {
    this.observer.disconnect();
  };
  return observerWrapper;
}

let smartimationObserver = null
function attachListeners() {
    _dislikeHost()?.addEventListener("click", dislikeClicked);
    _likeHost()?.addEventListener("click", likeClicked)
    
    if (!smartimationObserver) {
        smartimationObserver = createObserver({
            attributes: true,
            subtree: true,
        }, dislikeClicked)
        smartimationObserver.container = null;
    }
    
    let container = _buttonHost()?.querySelector(".smartimation")
    if (container && container != smartimationObserver.container) {
        cLog("Re-connecting observer")
        smartimationObserver.disconnect();
        smartimationObserver.observe(container);
        smartimationObserver.container = container;
    }
}


function run() {
    let checkRanTimer;
    
    cLog("Running...")
    const tryExec = () => {
        const dislikeBtn = getDislikeButton();
        if (!dislikeBtn) return; // console.error("It's not my time yet");
        clearInterval(checkRanTimer);
        
        cLog("Attaching to video ratings")
        
        updateLikedState();
        attachListeners();
        
        fetchStatus();
    };
    
    checkRanTimer = setInterval(tryExec, 100);
}

function tryRun() {
    cLog("Attempting run")
    if (window.location.pathname !== "/watch") return cErr(`Page is not video (/watch)`);
    
    const searchParams = new URLSearchParams(window.location.search);
    if (!searchParams.has("v")) return cErr("Page is not video (no video id in url)");
    
    run();
}

(() => {
    tryRun();
    window.addEventListener("yt-navigate-finish", tryRun, true);
})();
