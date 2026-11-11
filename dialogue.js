const dialogues = {
  meetGuard: {
    start: {
      speaker: 'guard',
      text: 'Can I help you?',
      choices: [
        { text: 'Who are you?', next: 'about' },
        { text: 'Goodbye.', next: 'end' },
      ],
    },
            about: {
            speaker: 'guard',
            text: 'I keep watch over this road.',
            choices: [{ text: 'Goodbye.', next: 'end' }],
            },
            end: {
            speaker: 'guard',
            text: 'Stay safe.',
            choices: [],
            },
  },
};

class Speech {
  constructor(dialogues) {
    this.dialogues = dialogues;
    this.dialogueId = null;
    this.nodeId = null;
  }

  start(dialogueId, nodeId = 'start') {
    const tree = this.dialogues[dialogueId];

    if (!tree) throw new Error(`Unknown dialogue: ${dialogueId}`);
    if (!tree[nodeId]) throw new Error(`Unknown dialogue node: ${nodeId}`);

    this.dialogueId = dialogueId;
    this.nodeId = nodeId;
    return this.current();
  }

  current() {
    if (!this.dialogueId) return null;
    return this.dialogues[this.dialogueId][this.nodeId];
  }

  choose(choiceIndex) {
    const node = this.current();
    if (!node) throw new Error('No dialogue is active');

    const choice = node.choices[choiceIndex];
    if (!choice) throw new Error(`Unknown choice: ${choiceIndex}`);

    return this.start(this.dialogueId, choice.next);
  }

  close() {
    this.dialogueId = null;
    this.nodeId = null;
  }
}

const dialogue = new Speech(dialogues);


class SpeechBubble extends Container {
  constructor(texture) {
    super();

    this.padding = 12;
    this.maxTextWidth = 240;

    this.panel = new NineSliceSprite({
      texture,
      leftWidth: 16,
      topHeight: 16,
      rightWidth: 16,
      bottomHeight: 16,
    });

    this.label = new Text({
      text: '',
      style: {
        fontSize: 18,
        fill: 0xffffff,
        wordWrap: true,
        wordWrapWidth: this.maxTextWidth,
      },
    });

    this.addChild(this.panel, this.label);
    this.visible = false;
    this.target = null;
  }

  show(target, message) {
    this.target = target;
    this.label.text = message;
    this.layout();
    this.visible = true;
  }

  layout() {
    const width = Math.min(this.label.width, this.maxTextWidth)
      + this.padding * 2;
    const height = this.label.height + this.padding * 2;

    // The bubble's position is its bottom-center point.
    this.panel.setSize(width, height);
    this.panel.position.set(-width / 2, -height);
    this.label.position.set(-width / 2 + this.padding, -height + this.padding);
  }

  update(bubbleLayer) {
    if (!this.visible || !this.target) return;

    // Convert the target's global bounds into the bubble layer's coordinates.
    const bounds = this.target.getBounds();
    const point = bubbleLayer.toLocal({
      x: bounds.x + bounds.width / 2,
      y: bounds.y,
    });

    this.position.set(point.x, point.y - 12);
  }

  hide() {
    this.visible = false;
    this.target = null;
  }
}