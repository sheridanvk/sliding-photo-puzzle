// Variables holding global game state
// tileState holds the game state at any point in time
var tileState = {
  // tileLoc will be set up as a hash of objects of the form {CSS id: tile position} where the locations are numbered 0 to 15.
  // nullLoc is the position of the gap, again numbers 0 through 15.
  tileLoc: {},
  nullLoc: ''
};
// gameWonState holds the state of the game that the player is aiming for
var gameWonState = {}

// Set up the board image, dimensions and initialise the tiles
function boardSetup() {
  var gameArea = document.getElementById('game-area');
  var img = new Image();
  img.src = 'https://cdn.glitch.com/24dc13be-ff08-4007-bf38-7c45e0b5d9e1%2FIMG_20180826_104348.jpg?1535662149619'
  
  var gameAspectRatio = img.naturalWidth / img.naturalHeight
  gameArea.style.setProperty('--img-url', `url(${img.src}`)
  gameArea.style.setProperty('--game-aspect-ratio', gameAspectRatio)
  
  var tileHTML = 
      `<div class="tile">
          <div class="number">
          </div>
        </div>`
  var tiles = [...Array(16)].map(_ => tileHTML)
  
  gameArea.innerHTML = tiles.join("")
}

// Position the image in the right place on each tile to reassemble it on the grid, and enable click events on the tiles
function tileSetup() {
  var tileArray = document.querySelectorAll('.tile')
  
  tileArray.forEach(function(tile,index) {
    // inexplicably, Chrome Android browser does not like it when some background image positions are set to 100%.
    // therefore capping this to 99.6%, which seems to display ok
    var backgroundPositionX = (index % 4) * 99.6/3
    var backgroundPositionY = Math.floor(index/4) * 99.6/3
    
    tile.id = `tile-${index}`
    tile.style.backgroundPosition = `${backgroundPositionX}% ${backgroundPositionY}%`
    
    tileState['tileLoc'][tile.id] = index
    gameWonState[tile.id] = index
    
    var tileNumber = index + 1
    tile.querySelector('.number').innerText = tileNumber
    
    
    tile.addEventListener('click', function(e) {
      if (document.querySelectorAll('.moving').length === 0) {
        makePlay(e.target.id)
      }
    })
  })
  //TODO: make choice of tile to remove user-customisable
  deleteTile('tile-15')
}

function deleteTile(tileId) {
  document.getElementById(tileId).remove()
  tileState['nullLoc'] = tileState['tileLoc'][tileId]
  delete tileState['tileLoc'][tileId]
  delete gameWonState[tileId]
}

// Put the board into a random state by making N moves back from the solved state.
// Randomised configurations only result in a solvable board 50% of the time.
function randomizeBoard() { 
  document.body.classList.remove('winning-animation')

  var count = 100
  while (count > 0) {
    automaticMove()
    --count
  }
  drawGame()
  document.getElementById('randomize-button').style.display = 'none'
}

function automaticMove() {
  if (document.querySelectorAll('.moving').length === 0) {
    var nullLoc = getNullLoc();
    var tileLocs = getTileLocs();

    var validMoves = {}

    for (var key in tileLocs) {
      if(findAdjacencyDirection(tileLocs[key], nullLoc))
        validMoves[key] = tileLocs[key]
    }
    var candidateTileId = Object.keys(validMoves)[Math.floor(Math.random() * Object.keys(validMoves).length)]

    
    tileState['tileLoc'][candidateTileId] = nullLoc
    tileState['nullLoc'] = validMoves[candidateTileId]
  }
  return null
}

function checkGameWon() {
  return Object.keys(tileState['tileLoc']).every((key) => tileState['tileLoc'][key] ===  gameWonState[key])
}

// Game play
function makePlay(tileId) {
  var tileLoc = getTileLoc(tileId);
  var nullLoc = getNullLoc();
  console.log(findAdjacencyDirection(tileLoc, nullLoc))
  if (findAdjacencyDirection(tileLoc, nullLoc)) {
    moveTile(tileId, tileLoc, nullLoc);
  }
  if (checkGameWon()) {
    document.getElementById('randomize-button').style.display = 'block'
    document.body.classList.add('winning-animation')
  }
}

// TODO: Refactor Tile into a class that contains all of this information
// It's not possible to apply transitions to elements moving between different positions on a grid.
// So here we fake it by applying a translate function in the direction in which the tile needs to move.
// We then redraw the board with all tiles on the grid once the transition's done.
function moveTile(tileId, tileLoc, nullLoc) {
  tileState['tileLoc'][tileId] = nullLoc
  tileState['nullLoc'] = tileLoc
  
  var tileEl = document.getElementById(tileId)
  
  var direction = findAdjacencyDirection(tileLoc, nullLoc)
  // need to move the tile 100% of the x or y direction, plus 3px to allow for grid-gap
  var moveX = `calc(${direction[0]*-100}% + ${direction[0]*-3}px)`
  var moveY = `calc(${direction[1]*-100}% + ${direction[1]*-3}px)`
  
  // The .moving class can't exist until we know what direction it needs to move in. 
  // So to add the rule, we add it to the stylesheet, not to the element itself.
  var styleSheetIndex = 
      Object.keys(document.styleSheets).find((key) => document.styleSheets[key].href.includes('/style.css'))
  document.styleSheets[styleSheetIndex].insertRule(`#${tileId}.moving { 
      transform: translate(${moveX}, ${moveY}); 
  }`);
  
  tileEl.addEventListener('transitionend', function() {
    // Note: new rules are added at 0, so we know we can remove the rule we added earlier from position 0. 
    // We'll still check in case we had a race condition and it's already gone :)
    var cssRules = document.styleSheets[styleSheetIndex].cssRules
    var styleRuleIndex = Object.keys(cssRules).find((key) => cssRules[key].selectorText === `#${tileId}.moving`)
    if (styleRuleIndex) {
      console.log(`styleRule: ${document.styleSheets[styleSheetIndex].cssRules[styleRuleIndex]}`)
      document.styleSheets[styleSheetIndex].deleteRule(styleRuleIndex)
    }
    console.log(`styleRuleIndex: ${styleRuleIndex}`)
    
    tileEl.classList.remove('moving')
    drawGame()
  })
  
  tileEl.classList.add('moving')
}

// Given a tile location and the location of the empty spot, tell us whether a move's valid, and if so, in what direction
function findAdjacencyDirection(tileLoc, nullLoc) {
  /* Return an x or y direction relative to the null space if the tile is adjacent, or if it isn't then return null
             [0, -1]
     [-1, 0]  null  [1, 0]
             [0, 1]
  */
  if ((tileLoc - nullLoc) === 4) {
    return [0, 1];
  } else if ((tileLoc - nullLoc) === -4) {
    return [0, -1];
  } else if ((tileLoc - nullLoc) === 1 && (tileLoc % 4 !== 0) ) {
    return [1, 0];
  } else if ((tileLoc - nullLoc) === -1 && (tileLoc % 4 !== 3) ) {
    return [-1, 0];
  } else return null
}

// Given the current board state, draw all the tiles on the grid at the right spots
function drawGame() {
  var tiles = getTileLocs()
  for (var key in tiles) {
    var tileLoc = tiles[key]
    
    if (tileLoc != null) { // only attempt to draw tile if it has a location
      var gridColumnStart = (tileLoc % 4) + 1
      var gridRowStart = Math.floor(tileLoc/4) + 1

      var tile = document.getElementById(key)
      tile.style.gridColumn = `${gridColumnStart} / ${gridColumnStart + 1}`
      tile.style.gridRow = `${gridRowStart} / ${gridRowStart + 1}`
    }
  };
}

function getTileLoc(tileId) {
  return tileState['tileLoc'][tileId]
}

function getTileLocs() {
  return tileState['tileLoc']
}

function setTileLocs(tileLocs) {
  tileState['tileLoc'] = tileLocs
}
  
function getNullLoc() {
  return tileState['nullLoc']
}

function testValidMoves() {
  console.log(`findAdjacencyDirection(1, 0) is [1, 0]: ${findAdjacencyDirection(1, 0)[0] === 1 && findAdjacencyDirection(1, 0)[1] === 0}`)
  console.log(`findAdjacencyDirection(1, 5) is [0, -1]: ${findAdjacencyDirection(1, 5)[0] === 0 && findAdjacencyDirection(1, 5)[1] === -1}`)
  console.log(`findAdjacencyDirection(13, 5) is null: ${findAdjacencyDirection(13, 5) === null}`)
  console.log(`findAdjacencyDirection(5, 1) is [0, 1]: ${findAdjacencyDirection(5, 1)[0] === 0 && findAdjacencyDirection(5, 1)[1] === 1}`)
  console.log(`findAdjacencyDirection(3, 4) is null: ${findAdjacencyDirection(3, 4) === null}`)
  console.log(`findAdjacencyDirection(4, 5) is [-1, 0]: ${findAdjacencyDirection(4, 5)[0] === -1 && findAdjacencyDirection(4, 5)[1] === 0}`)
  console.log(`findAdjacencyDirection(8, 7) is null: ${findAdjacencyDirection(8, 7) === null}`)
  console.log(`findAdjacencyDirection(9, 8) is [1, 0]: ${findAdjacencyDirection(9, 8)[0] === 1 && findAdjacencyDirection(9, 8)[1] === 0}`)
  console.log(`findAdjacencyDirection(1, 2) is [-1, 0]: ${findAdjacencyDirection(1, 2)[0] === -1 && findAdjacencyDirection(1, 2)[1] === 0}`)
  console.log(`findAdjacencyDirection(6, 2) is [0, 1]: ${findAdjacencyDirection(6, 2)[0] === 0 && findAdjacencyDirection(6, 2)[1] === 1}`)
  return true
}

// Start the game once everything's loaded.
window.onload = function () {
  boardSetup()
  tileSetup()
  drawGame()
  document.getElementById('randomize-button').style.display = 'block'
  //testValidMoves()
}