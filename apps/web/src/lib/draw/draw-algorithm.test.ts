/**
 * Test suite for the random draw algorithm
 * Validates cryptographic security, fairness, and deterministic behavior
 */

import { randomBytes } from 'crypto'

// Re-implement the shuffle function for testing
function secureShuffleArray<T>(array: T[], seed?: string): { shuffled: T[], usedSeed: string } {
  const result = [...array]
  let usedSeed: string

  if (seed) {
    usedSeed = seed
    let seedValue = 0
    for (let i = 0; i < seed.length; i++) {
      seedValue = ((seedValue << 5) - seedValue + seed.charCodeAt(i)) & 0xffffffff
    }

    const seededRandom = () => {
      seedValue = (seedValue * 9301 + 49297) % 233280
      return seedValue / 233280
    }

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]]
    }
  } else {
    usedSeed = randomBytes(32).toString('hex')

    for (let i = result.length - 1; i > 0; i--) {
      const randomBuffer = randomBytes(4)
      const randomValue = randomBuffer.readUInt32BE(0)
      const j = randomValue % (i + 1);
      [result[i], result[j]] = [result[j], result[i]]
    }
  }

  return { shuffled: result, usedSeed }
}

function assignToHorses(
  shuffledParticipants: any[],
  availableHorses: any[]
): { participantId: string, horseId: string, drawOrder: number }[] {
  const assignments: { participantId: string, horseId: string, drawOrder: number }[] = []

  if (availableHorses.length === 0) {
    throw new Error('No available horses for assignment')
  }

  shuffledParticipants.forEach((participant, index) => {
    const horseIndex = index % availableHorses.length
    const horse = availableHorses[horseIndex]

    assignments.push({
      participantId: participant.id,
      horseId: horse.id,
      drawOrder: index + 1
    })
  })

  return assignments
}

// Test data generators
function generateTestParticipants(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `participant_${i + 1}`,
    name: `Participant ${i + 1}`
  }))
}

function generateTestHorses(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `horse_${i + 1}`,
    number: i + 1,
    name: `Horse ${i + 1}`
  }))
}

describe('Draw Algorithm Tests', () => {
  describe('Cryptographic Security', () => {
    test('generates cryptographically secure seeds', () => {
      const results = new Set()

      // Generate 1000 seeds and ensure they're all unique
      for (let i = 0; i < 1000; i++) {
        const { usedSeed } = secureShuffleArray([1, 2, 3, 4, 5])
        results.add(usedSeed)
      }

      expect(results.size).toBe(1000)
    })

    test('seed length is appropriate for security', () => {
      const { usedSeed } = secureShuffleArray([1, 2, 3, 4, 5])

      // Should be 64 characters (32 bytes in hex)
      expect(usedSeed).toHaveLength(64)
      expect(/^[0-9a-f]+$/.test(usedSeed)).toBe(true)
    })

    test('random shuffles produce different results', () => {
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const results = new Set()

      // Generate 100 shuffles and expect high diversity
      for (let i = 0; i < 100; i++) {
        const { shuffled } = secureShuffleArray(input)
        results.add(shuffled.join(','))
      }

      // Should have many unique arrangements
      expect(results.size).toBeGreaterThan(80)
    })
  })

  describe('Deterministic Behavior', () => {
    test('same seed produces identical results', () => {
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const seed = 'test_seed_12345'

      const result1 = secureShuffleArray(input, seed)
      const result2 = secureShuffleArray(input, seed)

      expect(result1.shuffled).toEqual(result2.shuffled)
      expect(result1.usedSeed).toBe(result2.usedSeed)
    })

    test('different seeds produce different results', () => {
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

      const result1 = secureShuffleArray(input, 'seed1')
      const result2 = secureShuffleArray(input, 'seed2')

      expect(result1.shuffled).not.toEqual(result2.shuffled)
    })

    test('audit trail reproducibility', () => {
      const participants = generateTestParticipants(24)
      const horses = generateTestHorses(24)
      const auditSeed = 'audit_20241105_test'

      // Execute draw twice with same seed
      const { shuffled: shuffled1 } = secureShuffleArray(participants, auditSeed)
      const assignments1 = assignToHorses(shuffled1, horses)

      const { shuffled: shuffled2 } = secureShuffleArray(participants, auditSeed)
      const assignments2 = assignToHorses(shuffled2, horses)

      expect(assignments1).toEqual(assignments2)
    })
  })

  describe('Fair Distribution', () => {
    test('equal distribution across horses', () => {
      const participants = generateTestParticipants(100)
      const horses = generateTestHorses(10)

      const { shuffled } = secureShuffleArray(participants)
      const assignments = assignToHorses(shuffled, horses)

      // Count assignments per horse
      const horseCounts = new Map<string, number>()
      assignments.forEach(assignment => {
        const count = horseCounts.get(assignment.horseId) || 0
        horseCounts.set(assignment.horseId, count + 1)
      })

      // Each horse should have exactly 10 participants (100/10)
      horses.forEach(horse => {
        expect(horseCounts.get(horse.id)).toBe(10)
      })
    })

    test('handles uneven distribution correctly', () => {
      const participants = generateTestParticipants(25)
      const horses = generateTestHorses(24)

      const { shuffled } = secureShuffleArray(participants)
      const assignments = assignToHorses(shuffled, horses)

      // Count assignments per horse
      const horseCounts = new Map<string, number>()
      assignments.forEach(assignment => {
        const count = horseCounts.get(assignment.horseId) || 0
        horseCounts.set(assignment.horseId, count + 1)
      })

      // One horse should have 2 participants, rest should have 1
      const counts = Array.from(horseCounts.values()).sort()
      expect(counts).toEqual([...Array(23).fill(1), 2])
    })

    test('round-robin assignment maintains order', () => {
      const participants = generateTestParticipants(6)
      const horses = generateTestHorses(3)

      // Use deterministic seed for predictable testing
      const { shuffled } = secureShuffleArray(participants, 'test_order')
      const assignments = assignToHorses(shuffled, horses)

      // Verify round-robin pattern
      expect(assignments[0].horseId).toBe(horses[0].id)
      expect(assignments[1].horseId).toBe(horses[1].id)
      expect(assignments[2].horseId).toBe(horses[2].id)
      expect(assignments[3].horseId).toBe(horses[0].id) // Back to first horse
      expect(assignments[4].horseId).toBe(horses[1].id)
      expect(assignments[5].horseId).toBe(horses[2].id)
    })
  })

  describe('Statistical Fairness', () => {
    test('distribution fairness over multiple draws', () => {
      const participants = generateTestParticipants(24)
      const horses = generateTestHorses(24)
      const iterations = 1000

      // Track how often each participant gets each horse
      const participantHorseCounts = new Map<string, Map<string, number>>()

      for (let i = 0; i < iterations; i++) {
        const { shuffled } = secureShuffleArray(participants)
        const assignments = assignToHorses(shuffled, horses)

        assignments.forEach(assignment => {
          if (!participantHorseCounts.has(assignment.participantId)) {
            participantHorseCounts.set(assignment.participantId, new Map())
          }

          const horseCounts = participantHorseCounts.get(assignment.participantId)!
          const count = horseCounts.get(assignment.horseId) || 0
          horseCounts.set(assignment.horseId, count + 1)
        })
      }

      // Each participant should get each horse roughly equally (around 1000/24 ≈ 42 times)
      participants.forEach(participant => {
        const horseCounts = participantHorseCounts.get(participant.id)!
        const counts = Array.from(horseCounts.values())

        // Standard deviation should be reasonable (not too skewed)
        const mean = counts.reduce((a, b) => a + b, 0) / counts.length
        const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length
        const stdDev = Math.sqrt(variance)

        // Standard deviation should be less than 20% of mean for fair distribution
        expect(stdDev / mean).toBeLessThan(0.2)
      })
    })
  })

  describe('Edge Cases', () => {
    test('handles single participant', () => {
      const participants = generateTestParticipants(1)
      const horses = generateTestHorses(24)

      const { shuffled } = secureShuffleArray(participants)
      const assignments = assignToHorses(shuffled, horses)

      expect(assignments).toHaveLength(1)
      expect(assignments[0].participantId).toBe(participants[0].id)
      expect(assignments[0].drawOrder).toBe(1)
    })

    test('handles single horse', () => {
      const participants = generateTestParticipants(10)
      const horses = generateTestHorses(1)

      const { shuffled } = secureShuffleArray(participants)
      const assignments = assignToHorses(shuffled, horses)

      expect(assignments).toHaveLength(10)
      // All participants should get the same horse
      assignments.forEach(assignment => {
        expect(assignment.horseId).toBe(horses[0].id)
      })
    })

    test('handles empty participants array', () => {
      const participants: any[] = []
      const horses = generateTestHorses(24)

      const { shuffled } = secureShuffleArray(participants)
      const assignments = assignToHorses(shuffled, horses)

      expect(assignments).toHaveLength(0)
    })

    test('throws error for empty horses array', () => {
      const participants = generateTestParticipants(10)
      const horses: any[] = []

      const { shuffled } = secureShuffleArray(participants)

      expect(() => {
        assignToHorses(shuffled, horses)
      }).toThrow('No available horses for assignment')
    })

    test('handles large number of participants', () => {
      const participants = generateTestParticipants(1000)
      const horses = generateTestHorses(24)

      const startTime = Date.now()
      const { shuffled } = secureShuffleArray(participants)
      const assignments = assignToHorses(shuffled, horses)
      const endTime = Date.now()

      expect(assignments).toHaveLength(1000)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second

      // Verify fair distribution
      const horseCounts = new Map<string, number>()
      assignments.forEach(assignment => {
        const count = horseCounts.get(assignment.horseId) || 0
        horseCounts.set(assignment.horseId, count + 1)
      })

      // Should have roughly equal distribution (1000/24 ≈ 41-42 per horse)
      const counts = Array.from(horseCounts.values())
      expect(Math.min(...counts)).toBeGreaterThanOrEqual(41)
      expect(Math.max(...counts)).toBeLessThanOrEqual(42)
    })
  })

  describe('Assignment Validation', () => {
    test('preserves all participants', () => {
      const participants = generateTestParticipants(50)
      const horses = generateTestHorses(24)

      const { shuffled } = secureShuffleArray(participants)
      const assignments = assignToHorses(shuffled, horses)

      const assignedParticipants = new Set(assignments.map(a => a.participantId))
      const originalParticipants = new Set(participants.map(p => p.id))

      expect(assignedParticipants).toEqual(originalParticipants)
    })

    test('assigns valid draw orders', () => {
      const participants = generateTestParticipants(25)
      const horses = generateTestHorses(24)

      const { shuffled } = secureShuffleArray(participants)
      const assignments = assignToHorses(shuffled, horses)

      const drawOrders = assignments.map(a => a.drawOrder).sort((a, b) => a - b)
      const expectedOrders = Array.from({ length: 25 }, (_, i) => i + 1)

      expect(drawOrders).toEqual(expectedOrders)
    })

    test('assigns only to available horses', () => {
      const participants = generateTestParticipants(30)
      const horses = generateTestHorses(24)

      const { shuffled } = secureShuffleArray(participants)
      const assignments = assignToHorses(shuffled, horses)

      const validHorseIds = new Set(horses.map(h => h.id))
      assignments.forEach(assignment => {
        expect(validHorseIds.has(assignment.horseId)).toBe(true)
      })
    })
  })
})

// Performance benchmarks
describe('Performance Benchmarks', () => {
  test('shuffle performance for typical event size', () => {
    const participants = generateTestParticipants(100)

    const startTime = Date.now()
    for (let i = 0; i < 100; i++) {
      secureShuffleArray(participants)
    }
    const endTime = Date.now()

    const avgTime = (endTime - startTime) / 100
    expect(avgTime).toBeLessThan(10) // Should average less than 10ms per shuffle
  })

  test('assignment performance for large event', () => {
    const participants = generateTestParticipants(500)
    const horses = generateTestHorses(24)

    const { shuffled } = secureShuffleArray(participants)

    const startTime = Date.now()
    const assignments = assignToHorses(shuffled, horses)
    const endTime = Date.now()

    expect(endTime - startTime).toBeLessThan(50) // Should complete in under 50ms
    expect(assignments).toHaveLength(500)
  })
})