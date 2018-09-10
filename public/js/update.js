function update() {
  this.handlerPlayerMovement();
  this.debug();
  this.handleEnemies();
}

function debug() {
  this.text.setText([
    'ScrollX: ' + this.cameras.main.scrollX,
    'ScrollY: ' + this.cameras.main.scrollY,
    'MidX: ' + Math.round(this.player.x),
    'MidY: ' + Math.round(this.player.y)
  ])
}

function move(sprite, animation, xVelocity, yVelocity) {
  sprite.anims.play(animation, true);
  sprite.setVelocity(xVelocity, yVelocity);
}

function handlerPlayerMovement() {

  if (cursors.left.isDown && cursors.up.isDown) {
    move(this.player, 'left', -160, -160);
  }
  else if (cursors.left.isDown && cursors.down.isDown) {
    move(this.player, 'left', -160, 160);
  }
  else if (cursors.right.isDown && cursors.up.isDown) {
    move(this.player, 'right', 160, -160);
  }
  else if (cursors.right.isDown && cursors.down.isDown) {
    move(this.player, 'right', 160, 160);
  }
  else if (cursors.left.isDown) {
    move(this.player, 'left', -160, 0);
  }
  else if (cursors.right.isDown) {
    move(this.player, 'right', 160, 0);
  }
  else if (cursors.up.isDown) {
    move(this.player, 'up', 0, -160);
  }
  else if (cursors.down.isDown) {
    move(this.player, 'down',0, 160);
  }
  else {
    this.player.anims.stop();
    this.player.setVelocity(0, 0);
  }
}

function handleEnemies() {
  this.enemies.children.iterate(enemy => {
    // TODO: could do closeness to player based on enemy vision
    if (enemy.visible &&
        Math.abs(enemy.x - this.player.x) < 200 &&
        Math.abs(enemy.x - this.player.x)) {

      this.physics.moveToObject(enemy, this.player, 100);

      // left
      if (enemy.body.velocity.x < 0 && enemy.body.velocity.x <= -Math.abs(enemy.body.velocity.y)) {
        enemy.anims.play('enemy_left', true);
      }
      // right
      else if (enemy.body.velocity.x > 0 && enemy.body.velocity.x >= Math.abs(enemy.body.velocity.y)) {
        enemy.anims.play('enemy_right', true);
      }
      // up
      else if (enemy.body.velocity.y < 0 && enemy.body.velocity.y <= -Math.abs(enemy.body.velocity.x)) {
        enemy.anims.play('enemy_up', true);
      }
      // down
      else {
        enemy.anims.play('enemy_down', true);
      }
    }
  });
}

