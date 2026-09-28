export default {
  slug: 'hole-party',
  title: 'Hole Party',
  tagline: 'Swallow the city. Then your friends.',
  description:
    'A 1 to 4 player party game on one screen: each player is a hole in a tiny city, swallowing cones, cars, trees and buses to grow, then gulping smaller rival holes. One button each, bots fill empty seats. Free, no download.',
  category: 'party',
  tags: ['party', 'multiplayer', '2 player', '4 player', 'one-button', 'hole', 'io', 'local multiplayer'],
  emoji: '🕳️',
  colors: ['#ff3d8b', '#2fd9ff'],
  bg: '#1a1133',
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
      'Tap your corner of the screen in the lobby to join (up to 4 players on one phone or tablet), then press PLAY. In the game your corner is your only button: hold it to glide your hole, let go to spin the arrow. Bots take every empty seat.',
    mouse: 'Click a corner to join, then click PLAY. Hold the mouse button on your corner to glide, release to spin the arrow. Bots fill the empty corners.',
    keyboard:
      'One key per player: Z (bottom left), M (bottom right), P (top right) and Q (top left). Press your key in the lobby to join and Enter or Space to start. Hold your key to glide, let go to spin. Playing alone? Space works too, and bots fill the other seats.',
  },
  howTo: [
    'Everyone grabs a corner of the screen: that corner is your one button. Empty seats are played by bots.',
    'While you are not holding, the arrow around your hole spins. Hold your button to glide the way it points.',
    'Glide over anything smaller than your hole and it tips over and falls in. Every bite makes you bigger.',
    'Grow about 20% bigger than a rival and you can swallow their hole whole. Smaller holes bounce off each other.',
    'When the 40 second clock runs out the biggest hole wins the round, unless it is the last hole left first. First to 2 crowns wins the cup.',
    'From round 2 a twist card changes the rules: turbo, giants, lights out, swapped buttons, gold rush, rush hour and more.',
  ],
  tips: [
    'Short taps are your steering wheel. Let go early so the arrow comes around, then hold to commit.',
    'Clean out a whole cluster before moving on: benches and bushes around a park add up fast.',
    'Cars need a hole about 20 pixels wide, the bus and the fountain a lot more. Grow on small stuff first.',
    'Watch the other rims. If someone is clearly bigger, keep the street between you and them.',
    'A golden crown floats over the biggest hole. When time is almost up, chase anything that keeps you on top.',
  ],
  faq: [
    { q: 'How many people can play Hole Party?', a: 'One to four on the same device. Each player taps a corner in the lobby, and any empty corners are played by bots, so you can also play solo against three bots.' },
    { q: 'What are the controls?', a: 'One button each. On a touch screen it is your corner of the screen; on a keyboard it is Z, M, P or Q. Hold to glide, let go to spin your arrow.' },
    { q: 'How do I swallow another player?', a: 'Get about 20% bigger than them and glide over the middle of their hole. Holes of similar size just bounce off each other.' },
    { q: 'What are twist cards?', a: 'Every round after the first draws a random twist, like Turbo, Giants, Lights Out, Swap, Gold Rush with triple value golden props, or Rush Hour with a street full of traffic.' },
    { q: 'Is it free?', a: 'Yes. Hole Party runs in your browser on phones, tablets and computers with nothing to install.' },
  ],
  about:
    'Hole Party is a pass-nothing, share-everything party game: up to four people crowd around one phone, tablet or laptop and each takes a corner. You are a hole in the ground of a busy little city block, and your arrow never stops spinning unless you hold your button. Time your holds to glide over cones, hydrants, benches and panicking pedestrians, watch them tip over the rim and drop in, and grow until parked cars, trees, food trucks, the bus and even the plaza fountain fit. Then turn on your friends: a hole that is 20% bigger swallows a smaller one whole. Rounds last 40 seconds, the biggest hole takes the crown, and every round after the first draws a twist card that changes the rules. Nobody around? Bots fill every empty seat, so it plays great solo too.',
  released: '2026-09-28',
};
