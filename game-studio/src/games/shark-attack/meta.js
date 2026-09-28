export default {
  slug: 'shark-attack',
  title: 'Shark Attack',
  tagline: 'One shark. Too many ducks. For now.',
  description:
    'A 1 to 4 player party game on one screen: one player starts as the shark, everyone else is a rubber duck, and every bite turns a duck into another shark. One button each, bots fill empty seats. Free, no download.',
  category: 'party',
  tags: ['party', 'multiplayer', '2 player', '4 player', 'one-button', 'tag', 'infection', 'local multiplayer'],
  emoji: '🦈',
  colors: ['#27b7e3', '#ff3d8b'],
  bg: '#21405a',
  width: 420,
  height: 740,
  startMode: 'immediate',
  revive: false,
  daily: false,
  maxScore: 3,
  scoreLabel: 'Crowns',
  party: { min: 1, max: 4 },
  controls: {
    touch:
      'Tap your corner of the screen in the lobby to join (up to 4 players on one phone or tablet), then press PLAY. In the game your corner is your only button: hold it to swim, let go to spin. Bots take every empty seat.',
    mouse: 'Click a corner to join, then click PLAY. Hold the mouse button on your corner to swim, release to spin. Bots fill the empty corners.',
    keyboard:
      'One key per player: Z (bottom left), M (bottom right), P (top right) and Q (top left). Press your key in the lobby to join and Enter or Space to start. Hold your key to swim, let go to spin. Playing alone? Space works too, and bots fill the other seats.',
  },
  howTo: [
    'Everyone grabs a corner of the screen: that corner is your one button. Empty seats are played by bots.',
    'Each round one player starts as the shark (never the same player twice in a row). Everyone else is a rubber duck.',
    'Let go and you spin in place. Hold your button to swim the way you are facing.',
    'Sharks swim 25% faster. Ducks get a splash boost every time they press again, so quick taps can save your tail feathers.',
    'A shark that bites a duck turns it into a shark too. Sharks wait a moment at the start, so scatter.',
    'Ducks still afloat after 35 seconds share the crown. If the sharks catch every duck, the original shark wins. First to 3 crowns takes the cup.',
  ],
  tips: [
    'As a duck, let go early: you spin faster than the sharks do, so a sharp turn right before a bite is your best dodge.',
    'Tap, tap, tap. Every fresh press is a splash boost, and it is the only way to out-swim a shark in a straight line.',
    'Corners are traps. Stay in open water where you can turn any way you like.',
    'As a shark, aim where the duck is going, not where it is. Bite with your nose: a bump from your side does not count.',
    'Once you are a shark, team up: two sharks coming from different sides are almost impossible to dodge.',
  ],
  faq: [
    { q: 'How many people can play Shark Attack?', a: 'One to four on the same device. Each player taps a corner in the lobby, and empty corners are played by bots, so you can also play solo against three bots.' },
    { q: 'What are the controls?', a: 'One button each. On a touch screen it is your corner of the screen; on a keyboard it is Z, M, P or Q. Hold to swim, let go to spin in place.' },
    { q: 'What happens when a shark catches me?', a: 'You turn into a shark and keep playing. Now you hunt the ducks that are left, which is half the fun.' },
    { q: 'What are twist cards?', a: 'Every round after the first draws a random twist, like Turbo, Giants, Lights Out, Swap, Feeding Frenzy with two sharks from the start, or Whirlpool, which sweeps everyone around the drain.' },
    { q: 'Is it free?', a: 'Yes. Shark Attack runs in your browser on phones, tablets and computers with nothing to install.' },
  ],
  about:
    'Shark Attack is a one-button party game of pool tag for up to four people on one phone, tablet or laptop. Each round one player drops in as the shark and everyone else bobs around as a rubber duck. Let go of your button and you spin; hold it and you swim. Sharks are faster, but ducks turn quicker and get a splash boost every time they press again. Every bite turns a duck into another shark, so the pool fills with fins and the last ducks are chased by the friends they just outlasted. Survive the 35 second round to share the crown, or, as the first shark, catch them all to win it alone. From round two a twist card shakes things up with turbo speed, giant ducks, lights out, swapped buttons, a feeding frenzy or a whirlpool. Nobody around? Bots fill every empty seat, so it plays great solo too.',
  released: '2026-09-28',
};
