var gameArea = document.getElementById('game-area');
var img = new Image();
img.src = 'https://cdn.glitch.com/24dc13be-ff08-4007-bf38-7c45e0b5d9e1%2FIMG_20180826_104348.jpg?1535662149619'
var tileState = {
  tileLoc: {},
  nullLoc: ''
};

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
    var backgroundPositionX = (index % 4) * 100/3
    var backgroundPositionY = Math.floor(index/4) * 100/3
    
    container.id = `container-${index}`
    container.style.backgroundPosition = `${backgroundPositionX}% ${backgroundPositionY}%`
    
    tileState['tileLoc'][container.id] = index
    
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
  tileState['tileLoc'][tileId] = null
}

window.onload = function() {
  boardSetup()
  createTiles()
  tileSetup()
  drawGame()
  //testValidMoves()
}

// Game play
function makePlay(tileId) {
  var tileLoc = getTileLoc(tileId);
  var nullLoc = getNullLoc();
  console.log(findAdjacencyDirection(tileLoc, nullLoc))
  if (findAdjacencyDirection(tileLoc, nullLoc)) {
    moveTile(tileId, tileLoc, nullLoc);
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
      Object.keys(document.styleSheets).find((key) => document.styleSheets[key].href === 'https://sliding-photo-puzzle.glitch.me/style.css')
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
  var tiles = tileState['tileLoc']
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
  
function getNullLoc() {
  return tileState['nullLoc']
}

function testValidMoves() {
  console.log(`checkValidMove(1, 0) is true: ${checkValidMove(1, 0) === true}`)
  console.log(`checkValidMove(1, 5) is true: ${checkValidMove(1, 5) === true}`)
  console.log(`checkValidMove(13, 5) is false: ${checkValidMove(13, 5) === false}`)
  console.log(`checkValidMove(5, 1) is true: ${checkValidMove(5, 1) === true}`)
  console.log(`checkValidMove(3, 4) is false: ${checkValidMove(3, 4) === false}`)
  console.log(`checkValidMove(4, 5) is true: ${checkValidMove(4, 5) === true}`)
  console.log(`checkValidMove(8, 7) is false: ${checkValidMove(8, 7) === false}`)
  console.log(`checkValidMove(9, 8) is true: ${checkValidMove(9, 8) === true}`)
  console.log(`checkValidMove(1, 2) is true: ${checkValidMove(1, 2) === true}`)
  console.log(`checkValidMove(6, 2) is true: ${checkValidMove(6, 2) === true}`)
  return true
}