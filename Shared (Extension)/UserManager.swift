//
//  UserManager.swift
//  YoutubeDislikes
//
//  Created by Linus Rönnbäck Larsson on 14/9/24.
//

import Foundation
import os.log

extension URLRequest {
    /// Prints the request as "raw" String
    ///
    /// Like:
    /// ```
    /// GET /path HTTP/1.1
    /// Host: host
    /// Header: Value
    /// Header: Value
    ///
    /// { "some": "body", "for PUT requests": "or POST requests" }
    /// ```
    var raw: String {
        """
        \(self.httpMethod ?? "") \(self.url?.relativePath ?? "")\(self.url?.query == nil ? "" : "?")\(self.url?.query ?? "") HTTP/1.1
        Host: \(self.url?.scheme ?? "")://\(self.url?.host ?? "")
        \((self.allHTTPHeaderFields?.compactMap { "\($0): \($1)" } ?? []).joined(separator: "\n"))
        \(String(data: self.httpBody ?? Data(), encoding: .utf8) ?? "")
        """
    }
}

func performRequest(for url: URL, method: String, body: Data? = nil) async throws -> Data {
    var request = URLRequest(url: url)
    request.httpMethod = method
    
    let bundleVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    let userAgent = "ReturnDislikes/\(bundleVersion)"
    request.setValue(userAgent, forHTTPHeaderField: "User-Agent")
    
    if let body = body {
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("*/*", forHTTPHeaderField: "Accept")
        request.httpBody = body
    }
    
    os_log(.info, "[Return Dislikes] Request: \(request.raw)")
    do {
        let (data, _) = try await URLSession.shared.data(for: request)
        os_log(.info, "[Return Dislikes] Response: \(data)")
        return data
    } catch (let err) {
        os_log(.error, "[Return Dislikes] Error retrieving data: \(err)")
        throw err
    }
}

func fetchData(from url: URL) async throws -> Data {
    return try await performRequest(for: url, method: "GET")
}

func postData<T: Codable>(to url: URL, body: T) async throws -> Data {
    let jsonData = try JSONEncoder().encode(body)
    return try await performRequest(for: url, method: "POST", body: jsonData)
}

let API_URL = "https://returnyoutubedislikeapi.com"

enum UserError: Error {
    case invalidRating
    case badVotesRequest(VoteRequest)
    case unsolvedPuzzle(PuzzleResponse)
    case unknownError(describes: String)
}

// Usage
class UserManager {
    var userId: String
    
    init(userId: String){
        self.userId = userId
        
        listenOnStore()
    }
    
    init() async throws {
        os_log(.default, "[Return Dislikes] Attempting to retrieve user id...")
        var userId = UserManager.retreiveUserId()
        
        os_log(.default, "[Return Dislikes] User id retrieved: \(userId ?? "")")
        
        if userId == nil || userId == "" {
            os_log(.default, "[Return Dislikes] No user id found, registering...")
            userId = await UserManager.registerUser()
        }
        
        guard userId?.isEmpty != true else {
            throw UserError.unknownError(describes: "Unable to retrieve user id")
        }
        
        self.userId = userId!
        listenOnStore()
    }
    
    func listenOnStore() {
        let iCloudStore = NSUbiquitousKeyValueStore.default
        NotificationCenter.default.addObserver(self, selector: #selector(storeDidChange), name: NSUbiquitousKeyValueStore.didChangeExternallyNotification, object: iCloudStore)
    }
    
    func vote(_ rating: Int, videoId: String) async throws {
        guard let _rating = RatingType(rawValue: rating) else { throw UserError.invalidRating }
        
        let request = VoteRequest(userId: self.userId, videoId: videoId, value: _rating)
        
        guard let puzzle = try? await postData(to: URL(string: API_URL + "/Interact/vote")!, body: request) else {
            guard let jsonData = try? JSONEncoder().encode(request) else { throw UserError.unknownError(describes: "Unable to throw lol") }
            os_log(.error, "[Return Dislikes] Failed to rate video with id: \(videoId), request body: \(String(data: jsonData, encoding: .utf8)!)")
            throw UserError.badVotesRequest(request)
        }
        
        guard let jsonData = try? JSONDecoder().decode(PuzzleResponse.self, from: puzzle) else {
            os_log(.error, "[Return Dislikes] Failed to decode puzzle response: \(String(data: puzzle, encoding: .utf8)!)")
            throw UserError.badVotesRequest(request)
        }
        
        guard let solution = await solvePuzzle(jsonData) else { throw UserError.unsolvedPuzzle(jsonData) }
        let response = VoteResponse(request, solution: solution)
        
        let _result = try? await postData(to: URL(string: API_URL + "/Interact/confirmVote")!, body: response)
        guard let __result = _result, String(data: __result, encoding: .utf8) == "true" else {
            os_log(.error, "[Return Dislikes] Failed to rate video with id: \(videoId), response: \(String(data: (_result ?? "nil".data(using: .utf8))!, encoding: .utf8)!)")
            throw UserError.unknownError(describes: "Failed to confirm vote")
        }
    }
    
    static func registerUser() async -> String? {
        let _userId = UUID().uuidString
        
        let url = URL(string: API_URL + "/Puzzle/registration?userId=\(_userId)")!
        let data = try? await fetchData(from: url)
        
        guard data != nil else { return nil }
        
        guard let jsonData = try? JSONDecoder().decode(PuzzleResponse.self, from: data!) else { return nil }
        
        let solution = await solvePuzzle(jsonData)
        guard let _solution = solution else {
            return nil
        }
        
        let response = ["solution": _solution]
        
        let _result = try? await postData(to: url, body: response)
        guard let __result = _result, String(data: __result, encoding: .utf8) == "true" else {
            os_log(.error, "[Return Dislikes] Failed to register user with id: \(_userId), response: \(String(data: (_result ?? "nil".data(using: .utf8))!, encoding: .utf8)!)")
            return nil
        }
        
        os_log(.default, "[Return Dislikes] User registered with id: \(_userId)")
        await storeUserId(_userId)
        
        return _userId
    }
    
    @objc func storeDidChange(_ notification: Notification) {
        os_log(.default, "[Return Dislikes] Store changed, re-assigning our userId")
        if let userId = UserManager.retreiveUserId() {
            self.userId = userId
        }
    }
    
    static func retreiveUserId() -> String? {
        // Access the iCloud KV store
        let iCloudStore = NSUbiquitousKeyValueStore.default
        
        // Retrieve the userId from the iCloud store
        if let userId = iCloudStore.string(forKey: "userId") {
            return userId
        } else {
            // Handle case where userId is not found
            print("No userId found in iCloud store.")
            return nil
        }
    }
    
    static func storeUserId(_ userId: String) async {
        let iCloudStore = NSUbiquitousKeyValueStore.default
        
        os_log(.default, "[Return Dislikes] Storing userId: \(userId) in iCloud store.")
        iCloudStore.set(userId, forKey: "userId")
        iCloudStore.synchronize()
    }
}
