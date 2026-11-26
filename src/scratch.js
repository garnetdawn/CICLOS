 owl: {
        interactionRange: 300,
         attention: { icon: 'what', range: 450 },
         starts: [
             { node: 'firstMeeting', when: { npc: { met: false } } },
             { node: 'returnVisit', when: { npc: { met: true } } },
         ],
         nodes: {
             firstMeeting: {
                 icon: 'friend',
                choices: [
                     { icon: 'friendWhat', next: '', when: { player: { carryingLeaf: true } } },
                     { icon: 'friend' },
                 ],
             },
             offerFood: {
                 icon: 'foodWhat',
                 choices: [
                     { icon: 'yes', effects: [{ type: 'feedNpc' }] },
                     { icon: 'no' },
                 ],
             },
             returnVisit: {
                 icon: 'what',
                 when: { npc: { fed: false }, player: { leavesEatenAtLeast: 2 } },
                 choices: [{ icon: 'no' }],
             },
         },
     },