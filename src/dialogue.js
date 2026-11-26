import { Container, Sprite } from 'pixi.js';

// Add NPC-specific dialogue trees here. Conditions in each `when` object are
// combined with AND; choices may also run `feedNpc`, `setNpcFlag`, or
// `setPlayerFlag` effects. A node may use `icon` or an `icons` sequence;
// sequence timing can be overridden with `iconHoldDuration` and `iconFadeDuration`.
export const dialogueTrees = {
    // Example:
    owl: {
        interactionRange: 300,
         attention: { icon: 'leafGlow', range: 450 },
         starts: [
             { node: 'firstMeeting', when: { npc: { met: false } } },
             { node: 'returnVisit', when: { npc: { met: true } } },
             { node: 'friendVisit', when: { npc: { fed: true } } },
         ],
         nodes: {
             firstMeeting: {
                 icon: 'friend',
                choices: [
                     { icon: 'friendWhat', next: 'knowledge'},
                     { icon: 'friend', next: 'knowledge' },
                 ],
             },

             knowledge: {
                icons: ['friend', 'sad', 'what',],
                choices: [
                    { icon: 'sad', next: 'knowledgeTwo' },
                    { icon: 'friend', next: 'knowledgeTwo' },
                 ],
            },

             knowledgeTwo: {
                icons: ['friend', 'foodWhat', 'foodGlow', 'eat'],
                choices: [
                    { icon: 'foodGlow', effects: [{ type: 'spawnLeaves' }] },
                    { icon: 'what', next: 'knowledgeTwo' },
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
                 icon: 'leafGlow',
                 when: { npc: { fed: false }},
                 choices: [
                    { icon: 'leafGlow', next: 'offerFood', when: { player: { carryingLeaf: true } } },
                 ],
             },
             friendVisit: {
                 icon: 'friend',
                 when: { npc: { fed: true }},
                 choices: [
                    { icon: 'friend' }
                 ],
             },
         },
     },
     dog: {
        interactionRange: 300,
         attention: { icon: 'sad', range: 450 },
         starts: [
             { node: 'firstMeeting', when: { npc: { met: false } } },
             { node: 'visit', when: { npc: { fed: true } } },
         ],
         nodes: {
            firstMeeting: {
                 icon: 'sad',
                choices: [
                     { icon: 'sad', next: 'firstMeeting'},
                     { icon: 'friendWhat', next: 'friendship'},
                 ],
             },
             friendship: {
                 icon: 'sad',
                choices: [
                     { icon: 'friend', next: 'firstMeeting'},
                     { icon: 'leafGlow', next: 'offerFood'},
                 ],
             },
             offerFood: {
                 icons: ['sad','friendWhat', 'sad'],
                choices: [
                     { icon: 'yes', when: { player: { carryingLeaf: true } }, effects: [{ type: 'feedNpc' }] },
                     { icon: 'no'},
                 ],
             },

             visit: {
                 icons: ['leafGlow', 'friend'],
                choices: [
                     { icon: 'friend'},
                 ],
             },
             

         }

     },
     bun: {
        interactionRange: 300,
         attention: { icon: 'no', range: 450 },
         starts: [
             { node: 'firstMeeting', when: { npc: { met: false } } },
             { node: 'visit', when: { npc: { met: true , fed:false } } },
             { node: 'fedVisit', when: { npc: { met: true , fed:true } } },

         ],
         nodes: {
            firstMeeting: {
                 icon: 'no',
                choices: [
                     { icon: 'what'},
                     { icon: 'friendWhat', next: 'offerFood' , when: { player: { carryingLeaf: true } }},
                 ],
             },
             offerFood: {
                 icons: ['foodWhat'],
                choices: [
                     { icon: 'yes', when: { player: { carryingLeaf: true } }, effects: [{ type: 'feedNpc' }] },
                     { icon: 'no'},
                 ],
             },
             visit: {
                 icon: 'no',
                choices: [
                     { icon: 'leafGlow', next: 'offerFood' , when: { player: { carryingLeaf: true } }},
                     { icon: 'what'},
                 ],
             },
             fedVisit: {
                 icon: 'foodWhat',
                choices: [
                     { icon: 'no'},
                     { icon: 'leafGlow', next: 'offerFood' , when: { player: { carryingLeaf: true } }},
                 ],
             },

     },

}}

export class NpcDialogueManager {
    constructor({
        screen,
        stage,
        viewport,
        ticker,
        getPlayer,
        icons,
        onFeed,
        onSpawnLeaves,
        interactionRange = 300,
        iconScale = 0.7,
        answerSpacing = 500,
        answerBottomOffset = 300,
        iconHoldDuration = 1500,
        iconFadeDuration = 180,
    }) {
        this.screen = screen;
        this.stage = stage;
        this.viewport = viewport;
        this.ticker = ticker;
        this.getPlayer = getPlayer;
        this.icons = icons;
        this.onFeed = onFeed;
        this.onSpawnLeaves = onSpawnLeaves;
        this.interactionRange = interactionRange;
        this.iconScale = iconScale;
        this.answerSpacing = answerSpacing;
        this.answerBottomOffset = answerBottomOffset;
        this.iconHoldDuration = iconHoldDuration;
        this.iconFadeDuration = iconFadeDuration;
        this.npcs = new Map();
        this.playerFlags = {};
        this.activeConversation = null;
        this.update = this.update.bind(this);

        ticker.add(this.update);
    }

    registerNpc(id, npc, tree) {
        if (!tree) return;
        if (this.npcs.has(id)) {
            throw new Error(`Dialogue NPC is already registered: ${id}`);
        }

        this.validateTree(id, tree);
        const registration = {
            id,
            npc,
            tree,
            state: { met: false, fed: false, flags: {} },
            attentionSprite: null,
            inAttentionRange: false,
            attentionFadeFrom: 0,
            attentionFadeTo: 0,
            attentionFadeElapsed: 0,
        };

        npc.container.eventMode = 'static';
        npc.container.cursor = 'pointer';
        npc.container.on('pointerdown', (event) => {
            event.stopPropagation();
            if (event.button !== 0) return;
            this.open(id);
        });

        this.npcs.set(id, registration);
    }

    validateTree(id, tree) {
        if (!tree.nodes || typeof tree.nodes !== 'object') {
            throw new Error(`Dialogue tree "${id}" must define nodes.`);
        }
        if (!tree.start && !Array.isArray(tree.starts)) {
            throw new Error(`Dialogue tree "${id}" must define start or starts.`);
        }
        if (tree.start && !tree.nodes[tree.start]) {
            throw new Error(`Unknown start node "${id}.${tree.start}".`);
        }
        for (const candidate of tree.starts || []) {
            if (!tree.nodes[candidate.node]) {
                throw new Error(`Unknown start node "${id}.${candidate.node}".`);
            }
        }

        if (tree.attention) this.getIcon(tree.attention.icon);
        for (const [nodeId, node] of Object.entries(tree.nodes)) {
            const nodeIcons = node.icons !== undefined
                ? node.icons
                : (node.icon ? [node.icon] : []);
            if (!Array.isArray(nodeIcons) || !nodeIcons.length
                || !nodeIcons.every((icon) => typeof icon === 'string')) {
                throw new Error(`Dialogue node "${id}.${nodeId}" needs an icon or a non-empty icons array.`);
            }
            nodeIcons.forEach((icon) => this.getIcon(icon));
            if (!Array.isArray(node.choices) || node.choices.length < 1 || node.choices.length > 2) {
                throw new Error(`Dialogue node "${id}.${nodeId}" needs one or two choices.`);
            }

            for (const choice of node.choices) {
                this.getIcon(choice.icon);
                if (choice.next && !tree.nodes[choice.next]) {
                    throw new Error(`Unknown dialogue node "${id}.${choice.next}".`);
                }
            }
            if (node.fallback && !tree.nodes[node.fallback]) {
                throw new Error(`Unknown dialogue fallback "${id}.${node.fallback}".`);
            }
            if (node.iconHoldDuration !== undefined && node.iconHoldDuration <= 0) {
                throw new RangeError(`Dialogue node "${id}.${nodeId}" iconHoldDuration must be positive.`);
            }
            if (node.iconFadeDuration !== undefined && node.iconFadeDuration <= 0) {
                throw new RangeError(`Dialogue node "${id}.${nodeId}" iconFadeDuration must be positive.`);
            }
        }
    }

    getIcon(iconId) {
        const texture = this.icons[iconId];
        if (!texture) {
            throw new Error(`Unknown dialogue icon: ${iconId}`);
        }
        return texture;
    }

    getPlayerState(player) {
        return {
            segments: player.seg,
            leavesEaten: player.leavesEaten || 0,
            carryingLeaf: player.container.children.some(
                (child) => child.label === 'Carried leaf',
            ),
        };
    }

    conditionsMatch(when, player, npcState) {
        if (!when) return true;

        const playerState = this.getPlayerState(player);
        const playerConditions = when.player || {};
        if (playerConditions.segmentsAtLeast !== undefined
            && playerState.segments < playerConditions.segmentsAtLeast) return false;
        if (playerConditions.segmentsAtMost !== undefined
            && playerState.segments > playerConditions.segmentsAtMost) return false;
        if (playerConditions.leavesEatenAtLeast !== undefined
            && playerState.leavesEaten < playerConditions.leavesEatenAtLeast) return false;
        if (playerConditions.carryingLeaf !== undefined
            && playerState.carryingLeaf !== playerConditions.carryingLeaf) return false;
        if (playerConditions.flags) {
            for (const [flag, expected] of Object.entries(playerConditions.flags)) {
                if (this.playerFlags[flag] !== expected) return false;
            }
        }

        for (const [key, expected] of Object.entries(when.npc || {})) {
            if (key === 'flags') {
                for (const [flag, flagValue] of Object.entries(expected)) {
                    if (npcState.flags[flag] !== flagValue) return false;
                }
            } else if (npcState[key] !== expected) {
                return false;
            }
        }

        return true;
    }

    getNpcPosition(registration) {
        const globalPosition = registration.npc.container.toGlobal({ x: 0, y: 0 });
        return this.viewport.toLocal(globalPosition);
    }

    open(id) {
        if (this.activeConversation) return false;

        const registration = this.npcs.get(id);
        const player = this.getPlayer();
        if (!registration || !player) return false;

        const distance = Math.hypot(
            player.container.x - registration.npc.container.x,
            player.container.y - registration.npc.container.y,
        );
        const interactionRange = registration.tree.interactionRange ?? this.interactionRange;
        if (distance > interactionRange) return false;

        const starts = registration.tree.starts
            || [{ node: registration.tree.start }];
        const start = starts.find((candidate) => {
            const node = registration.tree.nodes[candidate.node];
            return this.conditionsMatch(candidate.when, player, registration.state)
                && this.conditionsMatch(node.when, player, registration.state);
        });
        if (!start) return false;

        const root = new Container();
        const answerRoot = new Container();
        this.viewport.addChild(root);
        this.stage.addChild(answerRoot);
        this.activeConversation = {
            registration,
            player,
            root,
            answerRoot,
            moveBeforeConversation: player.move,
            phase: 'in',
            elapsed: 0,
            nodeId: null,
            sprites: [],
            answerSprites: [],
        };
        player.move = false;
        player.cancelScriptedTarget();
        this.showNode(start.node);
        if (this.activeConversation) {
            registration.state.met = true;
            this.hideAttention(registration);
        }

        return true;
    }

    showNode(nodeId) {
        const conversation = this.activeConversation;
        if (!conversation) return;

        const { registration, player, root } = conversation;
        const node = registration.tree.nodes[nodeId];
        if (!node || !this.conditionsMatch(node.when, player, registration.state)) {
            this.closeConversation();
            return;
        }

        const choices = node.choices.filter((choice) =>
            this.conditionsMatch(choice.when, player, registration.state));
        if (choices.length === 0) {
            if (node.fallback) {
                this.showNode(node.fallback);
            } else {
                this.closeConversation();
            }
            return;
        }

        conversation.nodeId = nodeId;
        const nodeIcons = node.icons || [node.icon];
        conversation.phase = nodeIcons.length > 1 ? 'speech-in' : 'in';
        conversation.elapsed = 0;
        conversation.iconElapsed = 0;
        conversation.nodeIcons = nodeIcons;
        conversation.iconIndex = 0;
        conversation.activeSpeakerIndex = 0;
        conversation.iconHoldDuration = node.iconHoldDuration ?? this.iconHoldDuration;
        conversation.iconFadeDuration = node.iconFadeDuration ?? this.iconFadeDuration;
        conversation.root.removeChildren().forEach((child) => child.destroy());
        conversation.answerRoot.removeChildren().forEach((child) => child.destroy());
        conversation.sprites = [];
        conversation.answerSprites = [];
        conversation.speakerSprites = [];

        for (let index = 0; index < 2; index += 1) {
            const speaker = new Sprite(this.getIcon(nodeIcons[0]));
            speaker.anchor.set(0.5);
            speaker.scale.set(node.scale ?? this.iconScale);
            speaker.position.set(0, -registration.npc.body.height * 0.7 - 35);
            speaker.alpha = 0;
            root.addChild(speaker);
            conversation.speakerSprites.push(speaker);
            conversation.sprites.push(speaker);
        }

        choices.forEach((choice, index) => {
            const answer = new Sprite(this.getIcon(choice.icon));
            answer.anchor.set(0.5);
            answer.scale.set(choice.scale ?? this.iconScale);
            answer.baseScale = answer.scale.x;
            answer.position.set(
                this.screen.width / 2
                    + (index - (choices.length - 1) / 2) * this.answerSpacing,
                this.screen.height - this.answerBottomOffset,
            );
            answer.alpha = 0;
            answer.eventMode = 'static';
            answer.cursor = 'pointer';
            answer.on('pointerover', () => {
                conversation.hoveredAnswer = answer;
            });
            answer.on('pointerout', () => {
                if (conversation.hoveredAnswer === answer) {
                    conversation.hoveredAnswer = null;
                }
            });
            answer.on('pointerdown', (event) => {
                event.stopPropagation();
                if (conversation.phase !== 'open') return;

                conversation.choice = choice;
                conversation.sprites.forEach((sprite) => {
                    sprite.eventMode = 'none';
                    sprite.fadeStartAlpha = sprite.alpha;
                });
                conversation.phase = 'out';
                conversation.elapsed = 0;
            });
            conversation.answerRoot.addChild(answer);
            conversation.sprites.push(answer);
            conversation.answerSprites.push(answer);
        });
    }

    applyEffects(effects, registration, player) {
        for (const effect of effects || []) {
            if (effect.type === 'feedNpc') {
                if (typeof this.onFeed !== 'function') {
                    throw new Error('Dialogue uses feedNpc but no onFeed handler was provided.');
                }
                if (this.onFeed(player, registration.npc)) {
                    registration.state.fed = true;
                }
            } else if (effect.type === 'spawnLeaves') {
                if (registration.state.flags.leavesSpawned) continue;
                if (typeof this.onSpawnLeaves !== 'function') {
                    throw new Error('Dialogue uses spawnLeaves but no onSpawnLeaves handler was provided.');
                }

                this.onSpawnLeaves(player, registration.npc);
                registration.state.flags.leavesSpawned = true;
            } else if (effect.type === 'setNpcFlag') {
                if (effect.flag === 'met' || effect.flag === 'fed') {
                    registration.state[effect.flag] = effect.value;
                } else {
                    registration.state.flags[effect.flag] = effect.value;
                }
            } else if (effect.type === 'setPlayerFlag') {
                this.playerFlags[effect.flag] = effect.value;
            } else {
                throw new Error(`Unknown dialogue effect: ${effect.type}`);
            }
        }
    }

    finishChoice(conversation) {
        const choice = conversation.choice;
        this.applyEffects(choice.effects, conversation.registration, conversation.player);

        if (choice.next) {
            this.showNode(choice.next);
        } else {
            this.closeConversation();
        }
    }

    closeConversation() {
        const conversation = this.activeConversation;
        if (!conversation) return;

        conversation.player.move = conversation.moveBeforeConversation;
        conversation.root.removeFromParent();
        conversation.root.destroy({ children: true });
        conversation.answerRoot.removeFromParent();
        conversation.answerRoot.destroy({ children: true });
        this.activeConversation = null;
    }

    createAttention(registration) {
        const config = registration.tree.attention;
        if (!config) return;

        if (!registration.attentionSprite) {
            const sprite = new Sprite(this.getIcon(config.icon));
            sprite.anchor.set(0.5);
            sprite.scale.set(config.scale ?? this.iconScale * 1);
            sprite.alpha = 0;
            sprite.eventMode = 'none';
            this.stage.addChild(sprite);
            registration.attentionSprite = sprite;
        }

        this.setAttentionFade(registration, 1);
    }

    hideAttention(registration) {
        if (!registration.attentionSprite) return;
        this.setAttentionFade(registration, 0);
    }

    setAttentionFade(registration, targetAlpha) {
        registration.attentionFadeFrom = registration.attentionSprite.alpha;
        registration.attentionFadeTo = targetAlpha;
        registration.attentionFadeElapsed = 0;
    }

    update(ticker) {
        const player = this.getPlayer();
        if (player) {
            for (const registration of this.npcs.values()) {
                const config = registration.tree.attention;
                if (!config) continue;

                const distance = Math.hypot(
                    player.container.x - registration.npc.container.x,
                    player.container.y - registration.npc.container.y,
                );
                const inRange = distance <= (config.range ?? this.interactionRange);

                if (inRange && !registration.inAttentionRange) {
                    registration.inAttentionRange = true;
                    this.createAttention(registration);
                } else if (!inRange && registration.inAttentionRange) {
                    registration.inAttentionRange = false;
                    this.hideAttention(registration);
                }

                if (registration.attentionSprite) {
                    registration.attentionFadeElapsed = Math.min(
                        registration.attentionFadeElapsed + ticker.deltaMS,
                        220,
                    );
                    const fadeProgress = registration.attentionFadeElapsed / 220;
                    registration.attentionSprite.alpha = registration.attentionFadeFrom
                        + (registration.attentionFadeTo - registration.attentionFadeFrom)
                            * fadeProgress;

                    if (fadeProgress >= 1 && registration.attentionFadeTo === 0) {
                        registration.attentionSprite.removeFromParent();
                        registration.attentionSprite.destroy();
                        registration.attentionSprite = null;
                        continue;
                    }

                    const faceBounds = registration.npc.face.getBounds();
                    const globalPosition = {
                        x: faceBounds.x + faceBounds.width / 2,
                        y: faceBounds.y - registration.attentionSprite.height / 2 - 12,
                    };
                    registration.attentionSprite.position.copyFrom(
                        this.stage.toLocal(globalPosition),
                    );
                }
            }
        }

        const conversation = this.activeConversation;
        if (!conversation) return;

        const position = this.getNpcPosition(conversation.registration);
        conversation.root.position.copyFrom(position);
        conversation.answerSprites.forEach((sprite, index) => {
            sprite.position.set(
                this.screen.width / 2
                    + (index - (conversation.answerSprites.length - 1) / 2)
                        * this.answerSpacing,
                this.screen.height - this.answerBottomOffset,
            );
        });

        if (conversation.phase === 'in') {
            conversation.elapsed = Math.min(conversation.elapsed + ticker.deltaMS, 220);
            const progress = conversation.elapsed / 220;
            conversation.speakerSprites[0].alpha = progress;
            conversation.answerSprites.forEach((sprite) => {
                sprite.alpha = progress;
            });
            if (progress >= 1) conversation.phase = 'open';
        } else if (conversation.phase === 'speech-in') {
            conversation.elapsed = Math.min(conversation.elapsed + ticker.deltaMS, 220);
            conversation.speakerSprites[0].alpha = conversation.elapsed / 220;
            if (conversation.elapsed >= 220) {
                conversation.phase = 'speech-hold';
                conversation.iconElapsed = 0;
            }
        } else if (conversation.phase === 'speech-hold') {
            conversation.iconElapsed += ticker.deltaMS;
            if (conversation.iconElapsed >= conversation.iconHoldDuration) {
                if (conversation.iconIndex < conversation.nodeIcons.length - 1) {
                    const nextSpeakerIndex = 1 - conversation.activeSpeakerIndex;
                    const nextSpeaker = conversation.speakerSprites[nextSpeakerIndex];
                    nextSpeaker.texture = this.getIcon(
                        conversation.nodeIcons[conversation.iconIndex + 1],
                    );
                    nextSpeaker.alpha = 0;
                    conversation.nextSpeakerIndex = nextSpeakerIndex;
                    conversation.phase = 'speech-crossfade';
                    conversation.elapsed = 0;
                } else {
                    conversation.phase = 'answers-in';
                    conversation.elapsed = 0;
                }
            }
        } else if (conversation.phase === 'speech-crossfade') {
            conversation.elapsed = Math.min(
                conversation.elapsed + ticker.deltaMS,
                conversation.iconFadeDuration,
            );
            const progress = conversation.elapsed / conversation.iconFadeDuration;
            conversation.speakerSprites[conversation.activeSpeakerIndex].alpha = 1 - progress;
            conversation.speakerSprites[conversation.nextSpeakerIndex].alpha = progress;
            if (progress >= 1) {
                conversation.activeSpeakerIndex = conversation.nextSpeakerIndex;
                conversation.iconIndex += 1;
                conversation.phase = 'speech-hold';
                conversation.iconElapsed = 0;
            }
        } else if (conversation.phase === 'answers-in') {
            conversation.elapsed = Math.min(conversation.elapsed + ticker.deltaMS, 220);
            const progress = conversation.elapsed / 220;
            conversation.answerSprites.forEach((sprite) => {
                sprite.alpha = progress;
            });
            if (progress >= 1) conversation.phase = 'open';
        } else if (conversation.phase === 'out') {
            conversation.elapsed = Math.min(conversation.elapsed + ticker.deltaMS, 250);
            const progress = conversation.elapsed / 250;
            conversation.sprites.forEach((sprite) => {
                sprite.alpha = sprite.fadeStartAlpha * (1 - progress);
            });
            if (progress >= 1) this.finishChoice(conversation);
        } else if (conversation.phase === 'open') {
            const hoverEase = 1 - Math.exp(-14 * ticker.deltaMS / 1000);
            conversation.answerSprites.forEach((sprite) => {
                const targetScale = sprite === conversation.hoveredAnswer
                    ? sprite.baseScale * 1.08
                    : sprite.baseScale;
                sprite.scale.set(
                    sprite.scale.x + (targetScale - sprite.scale.x) * hoverEase,
                );
            });
        }
    }
}