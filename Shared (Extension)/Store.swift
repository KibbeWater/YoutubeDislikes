//
//  Store.swift
//  YoutubeDislikes
//
//  Created by Linus Rönnbäck Larsson on 16/9/24.
//

import Foundation

func getStore() -> UserDefaults {
    return UserDefaults(suiteName: "group.com.kibbewater.return-dislikes")!
}
    
func setDisallowVoting(_ value: Bool) {
    let store = getStore()
    store.set(value, forKey: "disallowVoting")
    store.synchronize()
}
    
func getDisallowVoting() -> Bool {
    return getStore().bool(forKey: "disallowVoting")
}
