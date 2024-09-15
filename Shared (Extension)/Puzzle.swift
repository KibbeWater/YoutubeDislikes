//
//  Puzzle.swift
//  YoutubeDislikes
//
//  Created by Linus Rönnbäck Larsson on 15/9/24.
//

import Foundation
import CryptoKit

func countLeadingZeroes(_ uInt8View: [UInt8]) -> Int {
    var zeroes = 0
    for value in uInt8View {
        if value == 0 {
            zeroes += 8
        } else {
            var count = 1
            var shiftedValue = value
            if shiftedValue >> 4 == 0 {
                count += 4
                shiftedValue <<= 4
            }
            if shiftedValue >> 6 == 0 {
                count += 2
                shiftedValue <<= 2
            }
            zeroes += count - Int(shiftedValue >> 7)
            break
        }
    }
    return zeroes
}

func solvePuzzle(_ puzzle: PuzzleResponse) async -> String? {
    guard let challengeData = Data(base64Encoded: puzzle.challenge) else {
        return nil
    }
    
    var buffer = [UInt8](repeating: 0, count: 20)
    
    // Copy challenge data into buffer
    for (index, byte) in challengeData.prefix(16).enumerated() {
        buffer[index + 4] = byte
    }
    
    let maxCount = Int(pow(Double(2), Double(puzzle.difficulty))) * 3
    
    for i in 0..<maxCount {
        // Update the first 4 bytes of the buffer with the counter value
        let counterValue = UInt32(i).bigEndian
        buffer[0] = UInt8((counterValue >> 24) & 0xFF)
        buffer[1] = UInt8((counterValue >> 16) & 0xFF)
        buffer[2] = UInt8((counterValue >> 8) & 0xFF)
        buffer[3] = UInt8(counterValue & 0xFF)
        
        let hash = SHA512.hash(data: Data(buffer))
        let hashArray = Array(hash)
        
        if countLeadingZeroes(hashArray) >= puzzle.difficulty {
            return Data(buffer[0..<4]).base64EncodedString()
        }
    }
    
    return nil
}
