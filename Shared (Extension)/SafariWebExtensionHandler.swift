//
//  SafariWebExtensionHandler.swift
//  Shared (Extension)
//
//  Created by Linus Rönnbäck Larsson on 8/3/24.
//

import SafariServices
import os.log

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {

    func handleRegister() async -> NSExtensionItem {
        do {
            let userManager = try await UserManager()
            
            return successResponse(userManager.userId)
        } catch (let _err) {
            guard let error = _err as? UserError else { return errorResponse("Unknown error") }
            
            switch error {
            case .invalidRating:
                return errorResponse("Faulty error")
            case .badVotesRequest(let voteRequest):
                return errorResponse("Bad votes request: \(String(describing: voteRequest))")
            case .unsolvedPuzzle(let puzzleResponse):
                return errorResponse("Unable to solve puzzle: \(String(describing: puzzleResponse))")
            case .unknownError(let describes):
                return errorResponse(describes)
            case .optedOut:
                return errorResponse("User opted out")
            }
        }
    }
    
    func handleVotes(data: Any?) async -> NSExtensionItem {
        guard let dataObject = data as? [String: Any] else { return errorResponse("Invalid data format") }
        
        guard let videoId = dataObject["videoId"] as? String else { return errorResponse("Unable to retrieve video ID") }
        guard let rating = dataObject["rating"] as? Int else { return errorResponse("Unable to retrieve rating") }
        
        guard let userManager = try? await UserManager() else { return errorResponse("Unable to retrieve user manager") }
        
        do {
            try await userManager.vote(rating, videoId: videoId)
            return successResponse("Vote successful")
        } catch(let _err) {
            guard let error = _err as? UserError else { return errorResponse("Unknown error") }
            
            switch error {
            case .invalidRating:
                return errorResponse("Invalid rating: \(rating)")
            case .badVotesRequest(let voteRequest):
                return errorResponse("Bad votes request: \(String(describing: voteRequest))")
            case .unsolvedPuzzle(let puzzleResponse):
                return errorResponse("Unable to solve puzzle: \(String(describing: puzzleResponse))")
            case .unknownError(let describes):
                return errorResponse(describes)
            case .optedOut:
                return errorResponse("User opted out")
            }
        }
    }
    
    func handleGetId() async -> NSExtensionItem {
        guard let userId = UserManager.retreiveUserId() else {
            return errorResponse("User ID not found")
        }
        
        return successResponse(userId)
    }
    
    func errorResponse(_ error: String) -> NSExtensionItem {
        let responseData: [String: Any] = ["success": false, "error": error]
        os_log(.default, "[Return Dislikes] Error: \(error)")
        return generateResponse(responseData)
    }
    
    func successResponse(_ response: Any) -> NSExtensionItem {
        let responseData: [String: Any] = ["success": true, "data": response]
        return generateResponse(responseData)
    }
    
    func generateResponse(_ response: [String: Any]) -> NSExtensionItem {
        let _response = NSExtensionItem()
        if #available(iOS 15.0, macOS 11.0, *) {
            _response.userInfo = [SFExtensionMessageKey: response]
        } else {
            _response.userInfo = ["message": response]
        }
        return _response
    }
    
    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem
        
        let profile: UUID?
        if #available(iOS 17.0, macOS 14.0, *) {
            profile = request?.userInfo?[SFExtensionProfileKey] as? UUID
        } else {
            profile = request?.userInfo?["profile"] as? UUID
        }
        
        let message: Any?
        if #available(iOS 15.0, macOS 11.0, *) {
            message = request?.userInfo?[SFExtensionMessageKey]
        } else {
            message = request?.userInfo?["message"]
        }
        
        os_log(.default, "Received message from browser.runtime.sendNativeMessage: %@ (profile: %@)", String(describing: message), profile?.uuidString ?? "none")
        
        Task {
            var response: NSExtensionItem? = nil
            if let messageDict = message as? [String: Any], let eventType = messageDict["type"] as? String {
                os_log(.default, "[Return Dislikes] Received event '%@'", eventType)
                let data: Any? = messageDict["data"]
                switch eventType {
                case "register":
                    guard !getDisallowVoting() else {
                        response = errorResponse("User has opted out of voting")
                        break
                    }
                    response = await handleRegister()
                    break;
                case "vote":
                    guard !getDisallowVoting() else {
                        response = errorResponse("User has opted out of voting")
                        break
                    }
                    response = await handleVotes(data: data)
                    break;
                case "get-id":
                    response = await handleGetId()
                    break;
                case "get-settings":
                    response = successResponse(["disallowVoting": getDisallowVoting()])
                    break;
                default:
                    response = errorResponse("Invalid event type")
                    break;
                }
            }
            
            guard let _response = response else {
                os_log(.default, "[Return Dislikes] No response to send back to browser")
                return
            }
            
            context.completeRequest(returningItems: [ _response ], completionHandler: nil)
        }
    }
}
