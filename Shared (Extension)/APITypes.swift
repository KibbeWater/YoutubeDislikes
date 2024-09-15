//
//  APITypes.swift
//  YoutubeDislikes
//
//  Created by Linus Rönnbäck Larsson on 15/9/24.
//

import Foundation

enum RatingType: Int, Codable {
    case LIKE = 1
    case NEUTRAL = 0
    case DISLIKE = -1
}

struct PuzzleResponse: Codable {
    let challenge: String
    let solution: String?
    let difficulty: Int
}

struct VoteRequest: Codable {
    let userId: String
    let videoId: String
    let value: RatingType
}

struct VoteResponse: Codable {
    init(_ request: VoteRequest, solution: String) {
        self.userId = request.userId
        self.videoId = request.videoId
        self.value = request.value
        self.solution = solution
    }
    
    let userId: String
    let videoId: String
    let value: RatingType
    let solution: String
}
