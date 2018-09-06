var gameArea = document.getElementById('game-area');
var img = new Image();
img.src = 'https://cdn.glitch.com/24dc13be-ff08-4007-bf38-7c45e0b5d9e1%2FIMG_20180826_104348.jpg?1535662149619'
var tileState = {
  tileLoc: {},
  nullLoc: ''
};
var gameWon = {}

function boardSetup() {
  var gameAspectRatio = img.naturalWidth / img.naturalHeight
  gameArea.style.setProperty('--img-url', `url(${img.src}`)

  if (gameAspectRatio > 1) {
    var maxViewportWidth = 90;
    gameArea.style.setProperty('--game-width', `${maxViewportWidth}vw`)
    var height = maxViewportWidth / gameAspectRatio
    gameArea.style.setProperty('--game-height', `${height}vw`)
  } else {
    var maxViewportHeight = 80;
    var width = maxViewportHeight * gameAspectRatio
    gameArea.style.setProperty('--game-width', `${width}vh`)
    gameArea.style.setProperty('--game-height', `${maxViewportHeight}vh`)
  }
}

function createTiles() {
  var tileHTML = 
      `<div class="tile-container">
          <div class="tile">
            <div class="number">
            </div>
          </div>
        </div>`
  var tiles = [...Array(16)].map(_ => tileHTML)
  
  gameArea.innerHTML = tiles.join("")
}

function tileSetup() {
  var tileContainerArray = document.querySelectorAll('.tile-container')
  
  tileContainerArray.forEach(function(container,index) {
    // inexplicably, Chrome Android browser does not like it when some background image positions are set to 100%.
    // therefore capping this to 99.6%, which seems to display ok
    var backgroundPositionX = (index % 4) * 99.6/3
    var backgroundPositionY = Math.floor(index/4) * 99.6/3
    
    container.id = `container-${index}`
    container.style.backgroundPosition = `${backgroundPositionX}% ${backgroundPositionY}%`
    
    tileState['tileLoc'][container.id] = index
    gameWon[container.id] = index
    
    var tileNumber = index + 1
    container.querySelector('.number').innerText = tileNumber
    
    
    container.addEventListener('click', function(e) {
      if (document.querySelectorAll('.moving').length === 0) {
        if (e.target !== this) {
          e.target.parentElement.click()
        } else {
          makePlay(e.target.id)
        }
      }
    })
  })
  //TODO: make this user-customisable
  deleteTile('container-15')
}

function deleteTile(tileId) {
  document.getElementById(tileId).remove()
  tileState['nullLoc'] = tileState['tileLoc'][tileId]
  delete tileState['tileLoc'][tileId]
  delete gameWon[tileId]
}

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
  console.log('randomising')
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
  return Object.keys(tileState['tileLoc']).every((key) => tileState['tileLoc'][key] ===  gameWon[key])
}

window.onload = () => {
  boardSetup()
  createTiles()
  tileSetup()
  drawGame()
  document.getElementById('randomize-button').style.display = 'block'
  // testValidMoves()
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
function moveTile(tileId, tileLoc, nullLoc) {
  tileState['tileLoc'][tileId] = nullLoc
  tileState['nullLoc'] = tileLoc
  
  var tileEl = document.getElementById(tileId)
  
  var direction = findAdjacencyDirection(tileLoc, nullLoc)
  // need to move the tile 100% of the x or y direction, plus 3px to allow for grid-gap
  var moveX = `calc(${direction[0]*-100}% + ${direction[0]*-3}px)`
  var moveY = `calc(${direction[1]*-100}% + ${direction[1]*-3}px)`
  
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

function drawGame() {
  var tiles = getTileLocs()
  for (var key in tiles) {
    var tileLoc = tiles[key]
    
    if (tileLoc != null) { // only attempt to draw tile if it has a location
      var gridColumnStart = (tileLoc % 4) + 1
      var gridRowStart = Math.floor(tileLoc/4) + 1

      var container = document.getElementById(key)
      container.style.gridColumn = `${gridColumnStart} / ${gridColumnStart + 1}`
      container.style.gridRow = `${gridRowStart} / ${gridRowStart + 1}`
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