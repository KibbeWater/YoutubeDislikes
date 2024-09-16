function show(platform, enabled, useSettingsInsteadOfPreferences) {
    document.body.classList.add(`platform-${platform}`);

    if (useSettingsInsteadOfPreferences) {
        document.getElementsByClassName('platform-mac state-on')[0].innerText = "Return Dislikes’s extension is currently on. You can turn it off in the Extensions section of Safari Settings.";
        document.getElementsByClassName('platform-mac state-off')[0].innerText = "Return Dislikes's extension is currently off. You can turn it on in the Extensions section of Safari Settings.";
        document.getElementsByClassName('platform-mac state-unknown')[0].innerText = "You can turn on Return Dislikes's extension in the Extensions section of Safari Settings.";
        document.getElementsByClassName('platform-mac open-preferences')[0].innerText = "Quit and Open Safari Settings…";
    }

    if (typeof enabled === "boolean") {
        document.body.classList.toggle(`state-on`, enabled);
        document.body.classList.toggle(`state-off`, !enabled);
    } else {
        document.body.classList.remove(`state-on`);
        document.body.classList.remove(`state-off`);
    }
}

function openPreferences() {
    webkit.messageHandlers.controller.postMessage("open-preferences");
}

function setInitialValue(disallowVoting) {
    const checkbox = document.querySelector("#disallow-voting")
    checkbox.checked = disallowVoting ? "true" : undefined
}

document.querySelector("#disallow-voting").addEventListener("click", (e) => {
    webkit.messageHandlers.controller.postMessage(e.target.checked ? "disallow-voting" : "allow-voting")
})
document.querySelector("button.open-preferences").addEventListener("click", openPreferences);
