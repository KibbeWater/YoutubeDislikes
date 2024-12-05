const prfx = "Youtube Dislikes"
const cLog = (txt) => console.log(`[${prfx}] ${txt}`)
const cErr = (txt) => console.error(`[${prfx}] ${txt}`)

/*
 Source:
 https://github.com/Anarios/return-youtube-dislike
 */
function numberFormat(numberState) {
  return getNumberFormatter(numberState).format(numberState);
}

/*
 Source:
 https://github.com/Anarios/return-youtube-dislike
 */
function getNumberFormatter(val) {
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
    notation: val < 1_000_000 ? "standard" : "compact",
    compactDisplay: "short",
  });
  return formatter;
}

const isMobile = () => window.location.host == "m.youtube.com";
const isShorts = () => window.location.pathname.startsWith("/shorts/")
const isSpring24UI = () => document.querySelector("#fixed-columns-secondary") !== null;
const isSpring24Open = () => document.querySelector("#fixed-columns-secondary #secondary") !== null;

const _spring24UI = () => document.querySelector("#fixed-columns-secondary #secondary");
const _buttonHost = () =>
  (isSpring24UI()
    ? isSpring24Open()
      ? _spring24UI()
      : document
    : document
  ).querySelector(
    isShorts()
      ? isMobile()
        ? ".YtShortsCarouselCarouselItem[aria-hidden='false'] ytm-like-button-renderer"
        : ".reel-video-in-sequence[is-active] ytd-like-button-renderer"
      : ".YtSegmentedLikeDislikeButtonViewModelHost",
  );
const _likeHost = () =>
  _buttonHost()?.querySelector(
    isShorts()
      ? isMobile()
        ? "ytm-toggle-button-renderer:nth-child(1)"
        : "#like-button"
      : ".YtLikeButtonViewModelHost",
  );
const _dislikeHost = () =>
  _buttonHost()?.querySelector(
    isShorts()
      ? isMobile()
        ? "ytm-toggle-button-renderer:nth-child(2)"
        : "#dislike-button"
      : ".YtDislikeButtonViewModelHost",
  );

function getDislikeButton() {
    return _dislikeHost()?.querySelector("button");
}
function getLikeButton() {
    return _likeHost()?.querySelector("button");
}

function getVideoId() {
    if (isShorts()) {
        const pathSplits = window.location.pathname.split("/")
        return pathSplits[pathSplits.length - 1]
    }
    
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
    
    if (isLiked && isDisliked) return; // What the fuck?
    if (isLiked) likeState = STATE_LIKED;
    else if (isDisliked) likeState = STATE_DISLIKED;
    else likeState = STATE_NOTLIKED
}

function submitVote(vote) {
    if (vote !== -1 && vote !== 0 && vote !== 1) return;
    
    browser.runtime.sendMessage({ type: "vote", data: { videoId: getVideoId(), rating: vote } }).then((response) => {
        cLog("Received vote result: " + JSON.stringify(response));
    });
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
    const textData = videoData?.dislikes != undefined ? numberFormat(videoData.dislikes + addCount) : "ERR";
    const _isShort = isShorts();
    if (videoData && !_isShort) _updateDislikes(textData);
    else if (videoData) _updateDislikesShorts(textData);
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

function _updateDislikesShorts(dislikeText) {
    const dislikeBtn = _dislikeHost();
    if (!dislikeBtn) return;
    
    const txtSpan = dislikeBtn.querySelector(".yt-spec-button-shape-with-label__label span");
    if (txtSpan.innerText != dislikeText) txtSpan.innerText = dislikeText
}

let lastVote = STATE_NOTLIKED
function trySubmitVote() {
    if (likeState !== lastVote) {
        lastVote = likeState
        if (likeState == STATE_LIKED) return submitVote(1);
        else if (likeState == STATE_NOTLIKED) return submitVote(0);
        else if (likeState == STATE_DISLIKED) return submitVote(-1);
    }
}

function dislikeClicked() {
    updateLikedState();
    trySubmitVote();
    
    updateCount();
}

function likeClicked() {
    updateLikedState();
    trySubmitVote();

    updateCount();
}

const _shortsWrapper = () => document.querySelector(".YtShortsCarouselHost .YtShortsCarouselCarouselItems");
let oldSlide = false;
function didShortsSlide() {
    let shortsWrapper = _shortsWrapper();
    
    if (shortsWrapper.classList.contains("YtShortsCarouselSliding")) return oldSlide = true;
    if (!oldSlide) return;
    oldSlide = false;
    
    fetchStatus();
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
let shortNavObserver = null
function attachListeners() {
    _dislikeHost()?.addEventListener("click", dislikeClicked);
    _likeHost()?.addEventListener("click", likeClicked)
    
    if (!smartimationObserver) {
        smartimationObserver = createObserver({
            attributes: true,
            subtree: true,
            childList: true,
            characterData: isShorts() ? true : false
        }, dislikeClicked)
        smartimationObserver.container = null;
    }
    
    let container = isShorts() ? _buttonHost() : _buttonHost()?.querySelector(".smartimation")
    if (container && container != smartimationObserver.container) {
        cLog("Re-connecting observer")
        smartimationObserver.disconnect();
        smartimationObserver.observe(container);
        smartimationObserver.container = container;
    }
    
    if (isShorts() && isMobile()) {
        if (!shortNavObserver) {
            shortNavObserver = createObserver({
                attributes: true,
            }, didShortsSlide);
            shortNavObserver.container = null;
        }
        
        let shortsWrapper = _shortsWrapper();
        console.log(shortsWrapper, shortNavObserver.container)
        if (shortsWrapper && shortsWrapper != shortNavObserver.container) {
            cLog("Re-connecting shorts navigation observer")
            shortNavObserver.disconnect();
            shortNavObserver.observe(shortsWrapper);
            shortNavObserver.container = container;
        }
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
    if (window.location.pathname !== "/watch" && !isShorts()) return cErr(`Page is not video or short (/watch || /shorts/*)`);
    
    if (!getVideoId()) return cErr(`Missing video ID`);
    
    run();
}

(() => {
    browser.runtime.sendMessage({ type: "echo", data: { hello: "world" } }).then((response) => {
        cLog("Received response from background " + JSON.stringify(response))
    });
    tryRun();
    window.addEventListener("yt-navigate-finish", tryRun, true);
})();
