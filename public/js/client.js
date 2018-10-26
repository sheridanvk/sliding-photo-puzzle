
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then(function() {
    console.log("Service Worker Registered");
  });
}

// Variables holding global game state
// tileState holds the game state at any point in time
const tileState = {
  // tileLoc will be set up as a hash of objects of the form {CSS id: tile position} where the locations are numbered 0 to 15.
  // nullLoc is the position of the gap, again numbers 0 through 15.
  tileLoc: {},
  nullLoc: ""
};
// gameWonState holds the state of the game that the player is aiming for
const gameWonState = {
  tileLoc: {},
  started: false
};

// Set up the board image, dimensions and initialise the tiles
function gameSetup() {
  const gameArea = document.getElementById("game-area");
  const img = new Image();
  img.src =
    "https://cdn.glitch.com/24dc13be-ff08-4007-bf38-7c45e0b5d9e1%2FIMG_20180826_104348.jpg?1537812587772";

  img.onload = function() {
    const gameAspectRatio = img.naturalWidth / img.naturalHeight;
    gameArea.style.setProperty("--img-url", `url(${img.src}`);
    gameArea.style.setProperty("--game-aspect-ratio", gameAspectRatio);

    const tileHTML = `<div class="tile" tabindex="0">
          <div class="number">
          </div>
        </div>`;
    const tiles = [...Array(16)].map(_ => tileHTML);

    gameArea.innerHTML = tiles.join("");

    tileSetup();
    drawGame();
    document.getElementById("randomize-button").style.display = "block";
  };
}

// Position the image in the right place on each tile to reassemble it on the grid, and enable click events on the tiles
function tileSetup() {
  const tileArray = document.querySelectorAll(".tile");
  tileArray.forEach((tile, index) => {
    tile.id = `tile-${index}`;
    
    // inexplicably, Chrome Android browser does not like it when some background image positions are set to 100%.	
    // therefore capping this to 99.6%, which seems to display ok
    const backgroundPositionX = ((index % 4) * 99.6) / 3;	
    const backgroundPositionY = (Math.floor(index / 4) * 99.6) / 3;
    tile.style.backgroundPosition = `${backgroundPositionX}% ${backgroundPositionY}%`;

    tileState["tileLoc"][tile.id] = index;
    gameWonState["tileLoc"][tile.id] = index;

    tile.querySelector(".number").innerText = index + 1;
 
    tile.addEventListener("mousedown", startSwipe);
    tile.addEventListener("touchstart", startSwipe);
  });

  //TODO: make choice of tile to remove user-customisable
  deleteTile("tile-15");
}

// from the excellent tutorial on unifying swipe types here: https://codepen.io/thebabydino/pen/qxebVa
function unify(e) {
  return e.changedTouches ? e.changedTouches[0] : e;
}

function startSwipe(e) {
  e.preventDefault();
  console.log("move started", e);

  const endType = e.type === "mousedown" ? "mouseup" : "touchend";

  document.addEventListener(endType, function detectSwipeDirection(f) {
    let swipeDirection = [
      unify(f).clientX - unify(e).clientX,
      unify(f).clientY - unify(e).clientY
    ];
    // turn swipe direction into a unit vector to make both values <= |1| (http://www.algebralab.org/lessons/lesson.aspx?file=Trigonometry_TrigVectorUnits.xml)
    const denominator = Math.sqrt(
      swipeDirection[0] ** 2 + swipeDirection[1] ** 2
    );
    console.log("denominator", denominator);

    if (denominator < 5 && endType === "touchend") {
      // if there's a slight movement by the user on a touch screen, treat it as a tap
      swipeDirection = [0, 0];
    } else if (denominator !== 0) {
      swipeDirection[0] = swipeDirection[0] / denominator;
      swipeDirection[1] = swipeDirection[1] / denominator;
    }

    makePlay(e.target.id, swipeDirection);

    document.removeEventListener(endType, detectSwipeDirection);
  });
}

function deleteTile(tileId) {
  document.getElementById(tileId).remove();
  tileState["nullLoc"] = tileState["tileLoc"][tileId];
  delete tileState["tileLoc"][tileId];
  delete gameWonState["tileLoc"][tileId];
}

// Put the board into a random state by making N moves back from the solved state.
// We can't use a randomised configuration, as it only results in a solvable board 50% of the time.
function randomizeBoard() {
  gameWonState.started = true;
  document.body.classList.remove("winning-animation");

  let count = 100;
  while (count > 0) {
    automaticMove();
    --count;
  }
  drawGame();
  document.getElementById("randomize-button").style.display = "none";
}

function automaticMove() {
  if (document.querySelectorAll(".moving").length === 0) {
    const nullLoc = getNullLoc();
    const tileLocs = getTileLocs();

    const validMoves = {};

    for (let key in tileLocs) {
      if (findAdjacencyDirection(tileLocs[key], nullLoc))
        validMoves[key] = tileLocs[key];
    }
    const candidateTileId = Object.keys(validMoves)[
      Math.floor(Math.random() * Object.keys(validMoves).length)
    ];

    tileState["tileLoc"][candidateTileId] = nullLoc;
    tileState["nullLoc"] = validMoves[candidateTileId];
  }
  return null;
}

function checkGameWon() {
  return (
    gameWonState.started &&
    Object.keys(tileState["tileLoc"]).every(
      key => tileState["tileLoc"][key] === gameWonState["tileLoc"][key]
    )
  );
}

// Game play
function makePlay(tileId, swipeDirection) {
  console.log("swipe dir", swipeDirection);
  const tileLoc = getTileLoc(tileId);
  const nullLoc = getNullLoc();
  const tileRelativePos = findAdjacencyDirection(tileLoc, nullLoc);
  console.log("tile relative pos", tileRelativePos);
  if (tileRelativePos) {
    if (
      swipeDirection.toString() === [0, 0].toString() ||
      (Math.abs(swipeDirection[0] + tileRelativePos[0]) < 0.5 &&
        Math.abs(swipeDirection[1] + tileRelativePos[1]) < 0.5)
    ) {
      moveTile(tileId, tileLoc, nullLoc);
    }
  }
  if (checkGameWon()) {
    document.getElementById("randomize-button").style.display = "block";
    document.body.classList.add("winning-animation");
    setTimeout(function() {
      document.body.classList.remove("winning-animation");
    }, 10000);
  }
}

// TODO: Refactor Tile into a class that contains all of this information
// It's not possible to apply transitions to elements moving between different positions on a grid.
// So here we fake it by applying a translate function in the direction in which the tile needs to move.
// We then redraw the board with all tiles on the grid once the transition's done.
function moveTile(tileId, tileLoc, nullLoc) {
  tileState["tileLoc"][tileId] = nullLoc;
  tileState["nullLoc"] = tileLoc;

  const tileEl = document.getElementById(tileId);

  const direction = findAdjacencyDirection(tileLoc, nullLoc);
  // need to move the tile 100% of the x or y direction, plus 3px to allow for grid-gap
  const moveX = `calc(${direction[0] * -100}% + ${direction[0] * -3}px)`;
  const moveY = `calc(${direction[1] * -100}% + ${direction[1] * -3}px)`;

  // The .moving class can't exist until we know what direction it needs to move in.
  // So to add the rule, we add it to the stylesheet, not to the element itself.
  const styleSheetIndex = Object.keys(document.styleSheets).find(key =>
    document.styleSheets[key].href.includes("/style.css")
  );
  document.styleSheets[styleSheetIndex].insertRule(`#${tileId}.moving { 
      transform: translate(${moveX}, ${moveY}); 
  }`);

  tileEl.addEventListener("transitionend", function() {
    // Note: new rules are added at 0, so we know we can remove the rule we added earlier from position 0.
    // We'll still check in case we had a race condition and it's already gone :)
    const cssRules = document.styleSheets[styleSheetIndex].cssRules;
    const styleRuleIndex = Object.keys(cssRules).find(
      key => cssRules[key].selectorText === `#${tileId}.moving`
    );
    if (styleRuleIndex) {
      console.log(
        `styleRule: ${
          document.styleSheets[styleSheetIndex].cssRules[styleRuleIndex]
        }`
      );
      document.styleSheets[styleSheetIndex].deleteRule(styleRuleIndex);
    }
    console.log(`styleRuleIndex: ${styleRuleIndex}`);

    tileEl.classList.remove("moving");
    drawGame();
  });

  tileEl.classList.add("moving");
}

// Given a tile location and the location of the empty spot, tell us whether a move's valid, and if so, in what direction
function findAdjacencyDirection(tileLoc, nullLoc) {
  /* Return an x or y direction relative to the null space if the tile is adjacent, or if it isn't then return null
             [0, -1]
     [-1, 0]  null  [1, 0]
             [0, 1]
  */
  if (tileLoc - nullLoc === 4) {
    return [0, 1];
  } else if (tileLoc - nullLoc === -4) {
    return [0, -1];
  } else if (tileLoc - nullLoc === 1 && tileLoc % 4 !== 0) {
    return [1, 0];
  } else if (tileLoc - nullLoc === -1 && tileLoc % 4 !== 3) {
    return [-1, 0];
  } else return null;
}

// Given the current board state, draw all the tiles on the grid at the right spots
function drawGame() {
  const tiles = getTileLocs();
  for (let key in tiles) {
    const tileLoc = tiles[key];

    if (tileLoc >= 0) {
      // only attempt to draw tile if it has a location
      const gridColumnStart = (tileLoc % 4) + 1;
      const gridRowStart = Math.floor(tileLoc / 4) + 1;

      const tile = document.getElementById(key);
      tile.style.gridColumn = `${gridColumnStart} / ${gridColumnStart + 1}`;
      tile.style.gridRow = `${gridRowStart} / ${gridRowStart + 1}`;
    }
  }
}

function getTileLoc(tileId) {
  return tileState["tileLoc"][tileId];
}

function getTileLocs() {
  return tileState["tileLoc"];
}

function setTileLocs(tileLocs) {
  tileState["tileLoc"] = tileLocs;
}

function getNullLoc() {
  return tileState["nullLoc"];
}

function testValidMoves() {
  console.log(
    `findAdjacencyDirection(1, 0) is [1, 0]: ${findAdjacencyDirection(
      1,
      0
    )[0] === 1 && findAdjacencyDirection(1, 0)[1] === 0}`
  );
  console.log(
    `findAdjacencyDirection(1, 5) is [0, -1]: ${findAdjacencyDirection(
      1,
      5
    )[0] === 0 && findAdjacencyDirection(1, 5)[1] === -1}`
  );
  console.log(
    `findAdjacencyDirection(13, 5) is null: ${findAdjacencyDirection(13, 5) ===
      null}`
  );
  console.log(
    `findAdjacencyDirection(5, 1) is [0, 1]: ${findAdjacencyDirection(
      5,
      1
    )[0] === 0 && findAdjacencyDirection(5, 1)[1] === 1}`
  );
  console.log(
    `findAdjacencyDirection(3, 4) is null: ${findAdjacencyDirection(3, 4) ===
      null}`
  );
  console.log(
    `findAdjacencyDirection(4, 5) is [-1, 0]: ${findAdjacencyDirection(
      4,
      5
    )[0] === -1 && findAdjacencyDirection(4, 5)[1] === 0}`
  );
  console.log(
    `findAdjacencyDirection(8, 7) is null: ${findAdjacencyDirection(8, 7) ===
      null}`
  );
  console.log(
    `findAdjacencyDirection(9, 8) is [1, 0]: ${findAdjacencyDirection(
      9,
      8
    )[0] === 1 && findAdjacencyDirection(9, 8)[1] === 0}`
  );
  console.log(
    `findAdjacencyDirection(1, 2) is [-1, 0]: ${findAdjacencyDirection(
      1,
      2
    )[0] === -1 && findAdjacencyDirection(1, 2)[1] === 0}`
  );
  console.log(
    `findAdjacencyDirection(6, 2) is [0, 1]: ${findAdjacencyDirection(
      6,
      2
    )[0] === 0 && findAdjacencyDirection(6, 2)[1] === 1}`
  );
  return true;
}

// Start the game once everything's loaded.
window.onload = function() {
  // account for browser chrome on mobile by setting the height of the document to the window 
  document.body.style.height = `${window.innerHeight}px`;
  gameSetup();
  //testValidMoves()
};
