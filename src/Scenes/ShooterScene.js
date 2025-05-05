"use strict";

class ShooterScene extends Phaser.Scene {
    constructor() {
        super("shooterScene");

        this.my = { sprite: {}, group: {} };
        this.baseX = 320;
        this.baseY = 550;
        this.bulletSpeed = 12;

        // placeholder for the boss sprite
        this.boss = null;

        // direction the boss moves horizontally
        this.bossDirection = 1;

        // maximum health of the boss
        this.maxBossHealth = 500;

        // reference to the boss looped sound
        this.bossSound = null;
    }

    preload() {
        this.load.setPath("./assets/");

        // load the tilemap and its tileset image
        this.load.tilemapTiledJSON("map", "TinyTownMap.json");
        this.load.image("tiny_town_tiles", "kenny-tiny-town-tilemap-packed.png");

        // load player sprites
        this.load.image("player_whale", "whale.png");
        this.load.image("player_ship",  "ship_0000.png");

        // load bullet and enemy sprites
        this.load.image("bullet",     "shot_grey_large.png");
        this.load.image("alienBeige", "alienBeige.png");
        this.load.image("alienBlue",  "alienBlue.png");
        this.load.image("alienPink",  "alienPink.png");

        // load boss and its projectiles
        this.load.image("boss",      "shipPink_manned.png");
        this.load.image("meteor",    "spaceMeteors_004.png");
        this.load.image("bossLaser", "tile_0006.png");

        // load frames for the puff animation
        this.load.image("whitePuff00", "whitePuff00.png");
        this.load.image("whitePuff01", "whitePuff01.png");
        this.load.image("whitePuff02", "whitePuff02.png");
        this.load.image("whitePuff03", "whitePuff03.png");

        // load sounds for the boss
        this.load.audio("bossLoop",     "computerNoise_000.ogg");
        this.load.audio("bossDefeated", "thrusterFire_000.ogg");
    }

    create() {
        const my = this.my;

        // create tilemap layers for the background
        const map = this.make.tilemap({ key: "map", tileWidth: 16, tileHeight: 16 });
        const tileset = map.addTilesetImage("tiny-town-packed", "tiny_town_tiles");
        map.createLayer("Grass-n-Houses", tileset, 0, 0).setScale(4);
        map.createLayer("Tree-n-Fences",  tileset, 0, 0).setScale(4);

        // create the UI text for score, health, win message, and restart prompt
        this.scoreText   = this.add.text(10, 10, "Score: 0",                  { fontSize: "20px", fill: "#fff" });
        this.healthText  = this.add.text(10, 40, "Health: 3",                 { fontSize: "20px", fill: "#fff" });
        this.winText     = this.add.text(160, 280, "YOU WIN!",                 { fontSize: "48px", fill: "#0f0" }).setVisible(false);
        this.restartText = this.add.text(130, 350, "Press R to Restart",       { fontSize: "32px", fill: "#0ff" }).setVisible(false);

        // create groups for bullets, enemies, enemy bullets, and boss bullets
        my.group.bullets      = this.physics.add.group();
        my.group.enemies      = this.physics.add.group();
        my.group.enemyBullets = this.physics.add.group();
        my.group.bossBullets  = this.physics.add.group();

        // define the puff animation used on enemy hits
        this.anims.create({
            key: "puff",
            frames: ["whitePuff00","whitePuff01","whitePuff02","whitePuff03"]
                .map(key => ({ key })),
            frameRate: 20,
            repeat: 0,
            hideOnComplete: true
        });

        // set up control keys for movement, shooting, and restart
        this.keys = this.input.keyboard.addKeys({
            left:    Phaser.Input.Keyboard.KeyCodes.A,
            right:   Phaser.Input.Keyboard.KeyCodes.D,
            shoot:   Phaser.Input.Keyboard.KeyCodes.SPACE,
            restart: Phaser.Input.Keyboard.KeyCodes.R
        });

        // set up collision between player bullets and enemies
        this.physics.add.overlap(
            my.group.bullets,
            my.group.enemies,
            this.bulletHitsEnemy,
            null,
            this
        );

        // initialize the first run of the game
        this.initGame();
    }

    update() {
        const my = this.my;

        // if game is over, listen for restart key
        if (this.gameOver) {
            if (Phaser.Input.Keyboard.JustDown(this.keys.restart)) {
                this.initGame();
            }
            return;
        }

        // remove any enemies that have fallen off the bottom of the screen
        my.group.enemies.getChildren().forEach(enemy => {
            if (enemy.active && enemy.y > this.game.config.height + enemy.displayHeight) {
                enemy.destroy();
            }
        });

        // move the player left and right
        if (this.keys.left.isDown)  my.sprite.avatar.x -= 8;
        if (this.keys.right.isDown) my.sprite.avatar.x += 8;

        // fire a bullet when the shoot key is pressed
        if (Phaser.Input.Keyboard.JustDown(this.keys.shoot)) {
            const b = my.group.bullets.create(
                my.sprite.avatar.x,
                my.sprite.avatar.y - 20,
                "bullet"
            );
            b.setVelocityY(-this.bulletSpeed * 30);
        }

        // spawn enemies in the first two levels
        if (this.level <= 2 && ++this.spawnTimer > 90) {
            this.spawnEnemy();
            this.spawnTimer = 0;
        }

        // transition from level one to two
        if (this.level === 1 && this.score >= 100) {
            this.level = 2;
        }

        // transition from level two to three and prepare boss
        if (this.level === 2 && this.score >= 200) {
            this.level = 3;
            this.showUpgradeAndSpawnBoss();
        }

        // in level two, enemies fire more often
        if (this.level === 2) {
            my.group.enemies.getChildren().forEach(enemy => {
                if (enemy.active && Phaser.Math.Between(0, 800) < 1) {
                    const m = my.group.enemyBullets.create(
                        enemy.x,
                        enemy.y + 20,
                        "meteor"
                    );
                    m.setScale(0.15);
                    this.physics.moveToObject(m, my.sprite.avatar, 150);
                }
            });
        }

        // boss movement and firing behavior in level three
        if (this.level === 3 && this.boss) {
            this.boss.x += 3 * this.bossDirection;
            if (this.boss.x <= 50 || this.boss.x >= 590) {
                this.bossDirection *= -1;
            }
            if (Phaser.Math.Between(0, 100) < 2) {
                this.fireBossLaser();
            }

            // update the boss’s health bar each frame
            this.bossHealthBar.clear();
            this.bossHealthBar.fillStyle(0xff0000, 1);
            this.bossHealthBar.fillRect(
                this.boss.x - 40,
                this.boss.y - 50,
                (this.bossHealth / this.maxBossHealth) * 80,
                10
            );
        }
    }

    // reset all game state, recreate the player avatar, and rehook collisions
    initGame() {
        const my = this.my;

        // stop boss loop sound if it is playing
        if (this.bossSound) {
            this.bossSound.stop();
            this.bossSound = null;
        }

        // reset score, health, level, and boss state
        this.score      = 0;
        this.health     = 3;
        this.level      = 1;
        this.spawnTimer = 0;
        this.gameOver   = false;
        this.boss       = null;
        this.bossHealth = this.maxBossHealth;

        // destroy old player sprite and create a new one
        if (my.sprite.avatar) my.sprite.avatar.destroy();
        my.sprite.avatar = this.physics.add.sprite(
            this.baseX,
            this.baseY,
            "player_whale"
        )
        .setScale(0.7)
        .setCollideWorldBounds(true);

        // reset the UI text values
        this.scoreText.setText("Score: 0");
        this.healthText.setText("Health: 3");
        this.winText.setVisible(false);
        this.restartText.setVisible(false);

        // clear out all existing bullets and enemies
        my.group.bullets.clear(true, true);
        my.group.enemies.clear(true, true);
        my.group.enemyBullets.clear(true, true);
        my.group.bossBullets.clear(true, true);

        // reestablish collisions for the new player sprite
        this.physics.add.overlap(
            my.group.bullets,
            my.group.enemies,
            this.bulletHitsEnemy,
            null,
            this
        );
        this.physics.add.overlap(
            my.sprite.avatar,
            my.group.enemies,
            this.enemyHitsPlayer,
            null,
            this
        );
        this.physics.add.overlap(
            my.sprite.avatar,
            my.group.enemyBullets,
            this.playerHitByBullet,
            null,
            this
        );
        this.physics.add.overlap(
            my.sprite.avatar,
            my.group.bossBullets,
            this.playerHitByBullet,
            null,
            this
        );
    }

    // create a single enemy that falls in levels one and two
    spawnEnemy() {
        const type = Phaser.Utils.Array.GetRandom([
            "alienBeige",
            "alienBlue",
            "alienPink"
        ]);
        const x = Phaser.Math.Between(50, 590);
        const y = (this.level === 1) ? 0 : Phaser.Math.Between(50, 200);

        const enemy = this.my.group.enemies.create(x, y, type);
        enemy.setVelocityY(this.level === 1 ? 100 : 0);

        // enemies require three hits to be destroyed
        enemy.health = 3;
    }

    // display upgrade message, swap to the ship avatar, then start the boss fight
    showUpgradeAndSpawnBoss() {
        const msg = this.add.text(
            100,
            250,
            "NEW ENEMY APPROACHES LETS UPGRADE",
            {
                fontSize: "28px",
                fill: "#ff0",
                backgroundColor: "#000",
                padding: { x: 8, y: 8 }
            }
        );

        this.time.delayedCall(2000, () => {
            msg.destroy();

            // change the player sprite to the ship version
            const { x, y } = this.my.sprite.avatar;
            this.my.sprite.avatar.destroy();
            this.my.sprite.avatar = this.physics.add.sprite(x, y, "player_ship")
                .setScale(1.5)
                .setCollideWorldBounds(true);
            this.my.sprite.avatar.body.setSize(
                this.my.sprite.avatar.width,
                this.my.sprite.avatar.height
            );

            // rehook collisions for the new ship avatar
            this.physics.add.overlap(
                this.my.sprite.avatar,
                this.my.group.enemies,
                this.enemyHitsPlayer,
                null,
                this
            );
            this.physics.add.overlap(
                this.my.sprite.avatar,
                this.my.group.enemyBullets,
                this.playerHitByBullet,
                null,
                this
            );
            this.physics.add.overlap(
                this.my.sprite.avatar,
                this.my.group.bossBullets,
                this.playerHitByBullet,
                null,
                this
            );

            // clear out any leftover enemies and start the boss
            this.my.group.enemies.clear(true, true);
            this.spawnBoss();
            this.physics.add.overlap(
                this.my.group.bullets,
                this.boss,
                this.bulletHitsBoss,
                null,
                this
            );
        });
    }

    // spawn the boss sprite, set its health, health bar, and start its background loop sound
    spawnBoss() {
        this.boss = this.physics.add.sprite(320, 100, "boss")
            .setScale(1)
            .setCollideWorldBounds(true);
        this.boss.body.allowGravity = false;

        // initialize the boss health counter
        this.bossHealth = this.maxBossHealth;

        this.bossHealthBar = this.add.graphics();
        this.bossSound     = this.sound.add("bossLoop", { loop: true, volume: 0.1 });
        this.bossSound.play();
    }

    // make the boss fire a laser at the player
    fireBossLaser() {
        this.cameras.main.shake(50, 0.005);
        const laser = this.my.group.bossBullets.create(
            this.boss.x,
            this.boss.y + 40,
            "bossLaser"
        )
        .setActive(true)
        .setVisible(true);
        laser.body.setSize(laser.width, laser.height);
        this.physics.moveToObject(laser, this.my.sprite.avatar, 200);
    }

    // handle a collision between a player bullet and an enemy
    bulletHitsEnemy(bullet, enemy) {
        bullet.destroy();
        enemy.health--;
        this.add.sprite(enemy.x, enemy.y, "whitePuff00")
            .setScale(0.5)
            .play("puff");
        if (enemy.health <= 0) {
            enemy.destroy();
            this.score += 10;
            this.scoreText.setText("Score: " + this.score);
        }
    }

    // handle a collision between a player bullet and the boss
    bulletHitsBoss(bullet, boss) {
        if (!bullet.active || !boss.active) return;
        bullet.destroy();

        this.bossHealth--;
        this.add.sprite(boss.x, boss.y, "whitePuff00")
            .setScale(0.5)
            .play("puff");

        this.bossHealthBar.clear();
        this.bossHealthBar.fillStyle(0xff0000, 1);
        this.bossHealthBar.fillRect(
            boss.x - 40,
            boss.y - 50,
            (this.bossHealth / this.maxBossHealth) * 80,
            10
        );

        if (this.bossHealth <= 0) {
            this.cameras.main.shake(250, 0.01);
            this.bossHealthBar.clear();
            boss.setActive(false).setVisible(false);
            this.time.delayedCall(300, () => {
                this.sound.play("bossDefeated", { volume: 0.1 });
                if (this.bossSound) this.bossSound.stop();
                boss.destroy();
                this.winText.setVisible(true);
                this.restartText.setVisible(true);
                this.gameOver = true;
            });
        }
    }

    // handle a collision between an enemy and the player
    enemyHitsPlayer(player, enemy) {
        enemy.destroy();
        this.takeDamage();
    }

    // handle a collision between a boss or enemy projectile and the player
    playerHitByBullet(player, bullet) {
        if (!bullet.active) return;
        bullet.disableBody(true, true);
        this.takeDamage();
    }

    // reduce player health and decide whether to reset or show restart prompt
    takeDamage() {
        this.health--;
        this.healthText.setText("Health: " + this.health);

        if (this.health <= 0) {
            if (this.level === 3) {
                // during the boss fight, show restart prompt
                this.gameOver = true;
                this.restartText.setVisible(true);
            } else {
                // in early levels, restart immediately
                this.initGame();
            }
        }
    }
}

window.ShooterScene = ShooterScene;
