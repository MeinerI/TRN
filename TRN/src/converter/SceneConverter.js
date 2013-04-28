TRN.LevelConverter = function(confMgr) {

	this.confMgr = confMgr;
	this.shaderMgr = new TRN.ShaderMgr();

	return this;
};

TRN.LevelConverter.prototype = {

	constructor : TRN.LevelConverter,

	getMaterial : function (objType, numLights) {
		var matName = '';
		if (typeof(numLights) == 'undefined') numLights = -1;

		switch(objType) {
			case 'room':
				matName = 'TR_room';
				if (!this.sc.materials[matName]) {
					this.sc.materials[matName] = {
						"type": "ShaderMaterial",
						"parameters": {
							"uniforms": {
								"map": { type: "t", value: "" },
								"ambientColor": { type: "v3", value: new THREE.Vector3(1.0, 1.0, 1.0) },
								"tintColor": { type: "v3", value: new THREE.Vector3(1.0, 1.0, 1.0) },
								"flickerColor": { type: "v3", value: new THREE.Vector3(1.2, 1.2, 1.2) },
								"curTime": { type: "f", value: 0.0 },
								"rnd": { type: "f", value: 0.0 },
								"offsetRepeat": { type: "v4", value: new THREE.Vector4(0.0, 0.0, 1.0, 1.0) }
							},
							"vertexShader": this.shaderMgr.getVertexShader('room'),
							"fragmentShader": this.sc.defaults.fog ? this.shaderMgr.getFragmentShader('standard_fog') : this.shaderMgr.getFragmentShader('standard'),
							"vertexColors" : true
						}
					};
				}
				break;
			case 'mesh':
				matName = 'TR_mesh';
				if (!this.sc.materials[matName]) {
					this.sc.materials[matName] = {
						"type": "ShaderMaterial",
						"parameters": {
							"uniforms": {
								"map": { type: "t", value: "" },
								"ambientColor": { type: "v3", value: new THREE.Vector3(1.0, 1.0, 1.0) },
								"tintColor": { type: "v3", value: new THREE.Vector3(1.0, 1.0, 1.0) },
								"flickerColor": { type: "v3", value: new THREE.Vector3(1.2, 1.2, 1.2) },
								"curTime": { type: "f", value: 0.0 },
								"rnd": { type: "f", value: 0.0 },
								"offsetRepeat": { type: "v4", value: new THREE.Vector4(0.0, 0.0, 1.0, 1.0) },
								"lighting": { type: "f", value: 0.0 }
							},
							"vertexShader": this.trlevel.rversion == 'TR3' || this.trlevel.rversion == 'TR4' ? this.shaderMgr.getVertexShader('mesh2') : this.shaderMgr.getVertexShader('mesh'),
							"fragmentShader": this.sc.defaults.fog ? this.shaderMgr.getFragmentShader('standard_fog') : this.shaderMgr.getFragmentShader('standard'),
							"vertexColors" : true
						}
					};
				}				
				break;
			case 'moveable':
				matName = 'TR_moveable' + (numLights >= 0 ? '_l' + numLights : '');
				if (!this.sc.materials[matName]) {
					var vertexShader;

					if (numLights >= 0) {
						vertexShader = this.shaderMgr.getVertexShader('moveable_with_lights');
						vertexShader = vertexShader.replace(/##num_lights##/g, numLights);
					} else {
						vertexShader = this.shaderMgr.getVertexShader('moveable');
					}
					this.sc.materials[matName] = {
						"type": "ShaderMaterial",
						"parameters": {
							"uniforms": {
								"map": { type: "t", value: "" },
								"ambientColor": { type: "v3", value: new THREE.Vector3(1.0, 1.0, 1.0) },
								"tintColor": { type: "v3", value: new THREE.Vector3(1.0, 1.0, 1.0) },
								"flickerColor": { type: "v3", value: new THREE.Vector3(1.2, 1.2, 1.2) },
								"curTime": { type: "f", value: 0.0 },
								"rnd": { type: "f", value: 0.0 },
								"offsetRepeat": { type: "v4", value: new THREE.Vector4(0.0, 0.0, 1.0, 1.0) },
								"lighting": { type: "f", value: 0.0 }
							},
							"vertexShader": vertexShader,
							"fragmentShader": this.sc.defaults.fog ? this.shaderMgr.getFragmentShader('standard_fog') : this.shaderMgr.getFragmentShader('standard'),
							"vertexColors" : true,
							"skinning": true
						}
					};
				}
				break;
		}

		return matName;
	},

	// create one texture per tile	
	createTextures : function () {

		// create one texture per tile	
		for (var i = 0; i < this.trlevel.textile.length; ++i) {
			this.sc.textures['texture' + i] = {
				/*"url": "TRN/texture/brick.jpg",*/
				"url": this.sc.texturePath  + this.sc.levelShortFileNameOrig + "_tile" + i + ".png",
				"anisotropy": 16
			};
		}
	},

	// Collect the animated textures
	createAnimatedTextures : function () {
		var i = 0, adata = this.trlevel.animatedTextures, numAnimatedTextures = adata[i++];
		var animatedTextures = [], mapObjTexture2AnimTexture = {};
		while (numAnimatedTextures-- > 0) {
			var numTextures = adata[i++] + 1, snumTextures = numTextures;
			var anmcoords = [];
			while (numTextures-- > 0) {
				var texture = adata[i++], tex = this.trlevel.objectTextures[texture], tile = tex.tile & 0x7FFF;
				var isTri = 
					(tex.vertices[3].Xpixel == 0)  &&
					(tex.vertices[3].Ypixel == 0)  &&
					(tex.vertices[3].Xcoordinate == 0)  &&
					(tex.vertices[3].Ycoordinate == 0);
			    var minU = 0x7FFF, minV = 0x7FFF, numVertices = isTri ? 3 : 4;

			    mapObjTexture2AnimTexture[texture] = { idxAnimatedTexture:animatedTextures.length, pos:snumTextures-numTextures-1 };

			    for (var j = 0; j < numVertices; j++) {
			        var u = tex.vertices[j].Xpixel;
			        var v = tex.vertices[j].Ypixel;

			        if (minU > u) minU = u; if (minV > v) minV = v;
			    }

			    anmcoords.push({ minU:(minU+0.5)/256, minV:(minV+0.5)/256, texture:"texture" + tile});
			}
			animatedTextures.push({
				"animcoords": anmcoords,
				"animspeed" : 6

			});
		}

		this.sc.animatedTextures = animatedTextures;
		this.trlevel.mapObjTexture2AnimTexture = mapObjTexture2AnimTexture; // => to know for each objTexture if it is part of an animated texture, and if yes which is its starting position in the sequence
	},

	// create one mesh
	createMesh : function (meshIndex) {

		if (this.sc.embeds['mesh' + meshIndex]) return; // mesh already created

		var mesh = this.trlevel.meshes[meshIndex];
		var meshJSON = this.createNewJSONEmbed();
		var attributes = {
			flags: { type:"v4", value:[] }
		};
		var tiles2material = {};

		var externalLit = this.makeMeshGeometry(mesh, meshIndex, meshJSON, tiles2material, this.trlevel.objectTextures, this.trlevel.mapObjTexture2AnimTexture, 0, attributes);

		meshJSON._materials = this.makeMaterialList(tiles2material, attributes, 'mesh');
		for (var m = 0; m < meshJSON._materials.length; ++m) {
			if (this.trlevel.rversion == 'TR3' || this.trlevel.rversion == 'TR4') {
				meshJSON._materials[m].uniforms.lighting = { type: "v3", value: new THREE.Vector3(1,1,1) }
			} else {
				meshJSON._materials[m].uniforms.lighting = { type: "f", value: 0.0 }
			}
		}

		this.sc.embeds['mesh' + meshIndex] = meshJSON;
		this.sc.geometries['mesh' + meshIndex] = {
			"type": "embedded",
			"id"  : "mesh" + meshIndex
		};

		return externalLit;
	},

	// create all the meshes of the level => not used
	createMeshes : function () {
		var numExternalLit = 0, numInternalLit = 0;

		for (var i = 0; i < this.trlevel.meshes.length; ++i) {

			var externalLit = this.createMesh(i);

			if (externalLit) numExternalLit++; else numInternalLit++;

		}
		console.log('Num meshes in level=' + this.trlevel.meshes.length + ', num externally lit=' + numExternalLit + ', num internally lit=' + numInternalLit);
	},

	createSprite : function (spriteIndex, flag, color) {

		if (this.sc.embeds['sprite' + spriteIndex]) return true; // sprite already created

		if (spriteIndex >= this.trlevel.spriteTextures.length) {
			console.log('spriteindex', spriteIndex, 'is too big: only', this.trlevel.spriteTextures.length, 'sprites in this.trlevel.spriteTextures !');
			return false;
		}

		var sprite = this.trlevel.spriteTextures[spriteIndex];
		console.log(spriteIndex, sprite)
		var meshJSON = this.createNewJSONEmbed();
		var attributes = {
			flags: { type:"v4", value:[] }
		};
		var tiles2material = {};

		meshJSON.vertices.push(sprite.leftSide, -sprite.topSide, 0);
		meshJSON.vertices.push(sprite.leftSide, -sprite.bottomSide, 0);
		meshJSON.vertices.push(sprite.rightSide, -sprite.bottomSide, 0);
		meshJSON.vertices.push(sprite.rightSide, -sprite.topSide, 0);

		for (var i = 0; i < 4; ++i) {
			meshJSON.colors.push(color);
			attributes.flags.value.push(flag);
		}

		var texturedRectangles = [
			{
				vertices: [0,1,2,3],
				texture: 0x8000,
			}
		];
		var width = (sprite.width-255)/256;
		var height = (sprite.height-255)/256;
		var objectTextures = [
			{
				attributes: 0,
				tile: sprite.tile,
				vertices: [
					{ Xpixel: sprite.x, 		Ypixel: sprite.y },
					{ Xpixel: sprite.x, 		Ypixel: sprite.y+height-1 },
					{ Xpixel: sprite.x+width-1, Ypixel: sprite.y+height-1 },
					{ Xpixel: sprite.x+width-1, Ypixel: sprite.y }
				]
			}
		];

		this.makeFaces(meshJSON, [texturedRectangles], tiles2material, objectTextures, null, 0);

		meshJSON._materials = this.makeMaterialList(tiles2material, attributes, 'room');
		for (var m = 0; m < meshJSON._materials.length; ++m) {
			if (this.trlevel.rversion == 'TR3' || this.trlevel.rversion == 'TR4') {
				meshJSON._materials[m].uniforms.lighting = { type: "v3", value: new THREE.Vector3(1,1,1) }
			} else {
				meshJSON._materials[m].uniforms.lighting = { type: "f", value: 0.0 }
			}
		}

		this.sc.embeds['sprite' + spriteIndex] = meshJSON;
		this.sc.geometries['sprite' + spriteIndex] = {
			"type": "embedded",
			"id"  : "sprite" + spriteIndex
		};

		return true;
	},

	// generate the rooms + static meshes in the room => one embedded object is created per room and per static mesh
	createRooms : function () {
		// flag the alternate rooms
		for (var m = 0; m < this.trlevel.rooms.length; ++m) {
			var room = this.trlevel.rooms[m];
			var alternate = room.alternateRoom;
			if (alternate != -1) {
				this.trlevel.rooms[alternate].isAlternate = true;
			}
		}
		
		var maxLightsInRoom = 0, roomL = -1;

		// generate the rooms
		for (var m = 0; m < this.trlevel.rooms.length; ++m) {
			//if (m != 10) continue;
			var room = this.trlevel.rooms[m];
			var info = room.info, rdata = room.roomData, rflags = room.flags, lightMode = room.lightMode;
			var isFilledWithWater = (rflags & 1) != 0, isFlickering = (lightMode == 1);
			var roomJSON = this.createNewJSONEmbed();
			var attributes = {
				flags: { type:"v4", value:[] }
			};
			var tiles2material = {};

			// push the vertices + vertex colors of the room
			for (var v = 0; v < rdata.vertices.length; ++v) {
				var rvertex = rdata.vertices[v];
				var vertexInfo = this.processRoomVertex(rvertex, isFilledWithWater, isFlickering);

				roomJSON.vertices.push(vertexInfo.x+info.x, vertexInfo.y, vertexInfo.z-info.z);
				attributes.flags.value.push(vertexInfo.flag);
				roomJSON.colors.push(vertexInfo.color);
			}

			// create the tri/quad faces
			this.makeFaces(roomJSON, [rdata.rectangles, rdata.triangles], tiles2material, this.trlevel.objectTextures, this.trlevel.mapObjTexture2AnimTexture, 0);
			
			// add the room to the scene
			this.sc.embeds['room' + m] = roomJSON;
			this.sc.geometries['room' + m] = {
				"type": "embedded",
				"id"  : "room" + m
			};
			this.sc.objects['room' + m] = {
				"geometry" : "room" + m,
				"material" : this.makeMaterialList(tiles2material, attributes),
				"position" : [ 0, 0, 0 ],
				"quaternion" : [ 0, 0, 0, 1 ],
				"scale"	   : [ 1, 1, 1 ],
				"visible"  : !room.isAlternate,
				"isAlternateRoom" : room.isAlternate,
				"filledWithWater": isFilledWithWater,
				"isRoom": true,
				"roomIndex": m
			};

			// static meshes in the room
			for (var s = 0; s < room.staticMeshes.length; ++s) {
				var staticMesh = room.staticMeshes[s];
				var x = staticMesh.x, y = -staticMesh.y, z = -staticMesh.z, rot = staticMesh.rotation;
				var objectID = staticMesh.objectID;

				var gstaticMesh = this.findStatichMeshByID(objectID);
				if (gstaticMesh == null) continue;

				var mindex = gstaticMesh.mesh, mflags = gstaticMesh.flags;
				var nonCollisionable = (mflags & 1) != 0, visible = (mflags & 2) != 0;

				if (!visible) continue;

				var q = new THREE.Quaternion();
				rot = ((rot & 0xC000) >> 14) * 90;
				q.setFromAxisAngle( { x:0, y:1, z:0}, THREE.Math.degToRad(-rot) );

				this.createMesh(mindex);

				var materials = [];
				for (var mat = 0; mat < this.sc.embeds['mesh' + mindex]._materials.length; ++mat) {
					var material = jQuery.extend(true, {}, this.sc.embeds['mesh' + mindex]._materials[mat]);
					material.uniforms.lighting.value = this.convertIntensity(staticMesh.intensity1);
					materials.push(material);
				}
				
				this.sc.objects['room' + m + '_staticmesh' + s] = {
					"geometry" : "mesh" + mindex,
					"material" : materials,
					"position" : [ x, y, z ],
					"quaternion" : [ q.x, q.y, q.z, q.w ],
					"scale"	   : [ 1, 1, 1 ],
					"visible"  : !room.isAlternate,
					"isAlternateRoom" : room.isAlternate,
					"filledWithWater": isFilledWithWater,
					"isStaticMesh": true,
					"roomIndex": m
				};

			}

			// sprites in the room
			for (var s = 0; s < rdata.sprites.length; ++s) {
				var sprite = rdata.sprites[s], spriteIndex = sprite.texture;
				var rvertex = rdata.vertices[sprite.vertex];
				var vertexInfo = this.processRoomVertex(rvertex, isFilledWithWater, isFlickering);

				if (!this.createSprite(spriteIndex, vertexInfo.flag, vertexInfo.color)) continue;

				var materials = [];
				for (var mat = 0; mat < this.sc.embeds['sprite' + spriteIndex]._materials.length; ++mat) {
					var material = jQuery.extend(true, {}, this.sc.embeds['sprite' + spriteIndex]._materials[mat]);
					materials.push(material);
				}
				//console.log('room',m,'sprite',s,this.sc.embeds['sprite' + spriteIndex])
				
				this.sc.objects['room' + m + '_sprite' + s] = {
					"geometry" : "sprite" + spriteIndex,
					"material" : materials,
					"position" : [ vertexInfo.x+info.x, vertexInfo.y, vertexInfo.z-info.z ],
					"quaternion" : [ 0, 0, 0, 1 ],
					"scale"	   : [ 1, 1, 1 ],
					"visible"  : !room.isAlternate,
					"isAlternateRoom" : room.isAlternate,
					"filledWithWater": isFilledWithWater,
					"isSprite": true,
					"roomIndex": m
				};
			}

			// lights in the room
			if (room.lights.length > maxLightsInRoom) {
				maxLightsInRoom = room.lights.length;
				roomL = m;
			}

			var ambient1 = room.ambientIntensity1, ambient2 = room.ambientIntensity2;
			var ambientColor = new THREE.Vector3();
			if (this.trlevel.rversion != 'TR4') {
				ambient1 = 1.0 - ambient1/0x2000;
				ambientColor.set(ambient1, ambient1, ambient1);
			} else {
				ambientColor.setX((ambient2 & 0xFF) / 255.0);
				ambientColor.setY(((ambient1 & 0xFF00) >> 8)  / 255.0);
				ambientColor.setZ((ambient1 & 0xFF)  / 255.0);
			}

			var lights = [];
			for (var l = 0; l < room.lights.length; ++l) {
				var light = room.lights[l], color = new THREE.Vector3(1, 1, 1);
				var fadeIn = 0, fadeOut = 0;
				switch(this.trlevel.rversion) {
					case 'TR1':
					case 'TR2':
						var intensity = light.intensity1;
		                if (intensity > 0x2000) intensity = 0x2000;
		                intensity = intensity / 0x2000;
		                color.set(intensity, intensity, intensity);
		                fadeOut = light.fade1;
						break;
					case 'TR3':
		                var r = light.color.r / 255.0;
		                var g = light.color.g / 255.0;
		                var b = light.color.b / 255.0;
		                var intensity = light.intensity;
		                if (intensity > 0x2000) intensity = 0x2000; // without this test, cut5 in TR3 (for eg) is wrong
		                intensity = intensity / 0x2000;
		                color.set(r*intensity, g*intensity, b*intensity);
		                fadeOut = light.fade;
						break;
					case 'TR4':
						// todo
						break;
				}
		        if (fadeOut > 0x7FFF) fadeOut = 0x8000;
		        if (fadeIn > fadeOut) fadeIn = 0;
				lights.push({
					x: light.x,
					y: -light.y,
					z: -light.z,
					color: color,
					fadeIn: fadeIn,
					fadeOut: fadeOut
				});
			}

			this.sc.objects['room' + m].lights = lights;
			this.sc.objects['room' + m].ambientColor = ambientColor;
		}

		console.log('num max lights in one room=' + maxLightsInRoom + '. room=' + roomL)
	},

	createAnimations : function () {
		var animations = [];

		for (var anm = 0; anm < this.trlevel.animations.length; ++anm) {
			var anim = this.trlevel.animations[anm];

			var frameOffset = anim.frameOffset / 2;
			var frameStep   = anim.frameSize;
			var numFrames = anim.frameEnd - anim.frameStart + 1;
			var animNumKeys = parseInt((numFrames - 1) / anim.frameRate) + 1;

			if ((numFrames - 1) % anim.frameRate) animNumKeys++;

			var animFPS = TRN.baseFrameRate;
			var animLength = ((animNumKeys-1) * anim.frameRate) / TRN.baseFrameRate;

			if (animLength == 0) {
				animFPS = 1.0;
				animLength = 1.0;
			}

			if (this.trlevel.rversion == 'TR1') {
				frameStep = this.trlevel.frames[frameOffset + 9] * 2 + 10;
			}

			var animBones = [];

			for (var key = 0; key < animNumKeys; key++)	{
				var frame = frameOffset + key * frameStep, sframe = frame;

				var BBLoX =  this.trlevel.frames[frame++], BBHiX =  this.trlevel.frames[frame++];
				var BBLoY = -this.trlevel.frames[frame++], BBHiY = -this.trlevel.frames[frame++];
				var BBLoZ = -this.trlevel.frames[frame++], BBHiZ = -this.trlevel.frames[frame++];

				var transX = this.trlevel.frames[frame++], transY = -this.trlevel.frames[frame++], transZ = -this.trlevel.frames[frame++];

				var numAnimatedMeshesUnknown = 99999, numAnimatedMeshes = numAnimatedMeshesUnknown;
				if (this.trlevel.rversion == 'TR1') {
					numAnimatedMeshes = this.trlevel.frames[frame++];
				}

				var mesh = 0;
				// Loop through all the meshes of the key
				while (mesh < numAnimatedMeshes) {
					var angleX = 0.0, angleY = 0.0, angleZ = 0.0;

					if (numAnimatedMeshes == numAnimatedMeshesUnknown && (frame-sframe) >= frameStep) break;

				    var frameData = this.trlevel.frames[frame++];
				    if (frameData < 0) frameData += 65536;

				    if ((frameData & 0xC000) && (this.trlevel.rversion != 'TR1')) { // single axis of rotation
				        var angle = this.trlevel.rversion == 'TR4' ? (frameData & 0xFFF) >> 2 : frameData & 0x3FF;

						angle *= 360.0 / 1024.0;

				        switch (frameData & 0xC000) {
				            case 0x4000:
				                angleX = angle;
				                break;
				            case 0x8000:
				                angleY = angle;
				                break;
				            case 0xC000:
				                angleZ = angle;
				                break;
			            }
			        } else { // 3 axis of rotation
						if (numAnimatedMeshes == numAnimatedMeshesUnknown && (frame-sframe) >= frameStep) break;

				        var frameData2 = this.trlevel.frames[frame++];
					    if (frameData2 < 0) frameData2 += 65536;

				        if (this.trlevel.rversion == 'TR1') {
				            var temp = frameData;
				            frameData = frameData2;
				            frameData2 = temp;
				        }

				        angleX = (frameData >> 4) & 0x03FF;
				        angleX *= 360.0 / 1024.0;

				        angleY = (frameData << 6) & 0x03C0;
				        angleY += (frameData2 >> 10) & 0x003F;
				        angleY *= 360.0 / 1024.0;

				        angleZ = frameData2 & 0x3FF;
				        angleZ *= 360.0 / 1024.0;
				    }

	                angleX *= Math.PI / 180.0;
					angleY *= Math.PI / 180.0;
					angleZ *= Math.PI / 180.0;

					var qx = new THREE.Quaternion(), qy = new THREE.Quaternion(), qz = new THREE.Quaternion();

					qx.setFromAxisAngle( {x:1,y:0,z:0}, angleX );
					qy.setFromAxisAngle( {x:0,y:1,z:0}, -angleY );
					qz.setFromAxisAngle( {x:0,y:0,z:1}, -angleZ );

				    qy.multiply(qx).multiply(qz);

				    if (animBones.length <= mesh) {
						animBones.push({
							"keys": []
						});
				    }

					var bone = animBones[mesh];

					bone.keys.push({
						"time": (key * anim.frameRate) / TRN.baseFrameRate,
						"pos":  [ transX, transY, transZ ], 
						"rot":  [ qy.x, qy.y, qy.z, qy.w ], 
						"scl":  [ 1, 1, 1 ]
					});

					if (animNumKeys == 1) {
						// three js needs at least two keys for skeleton animation
						bone.keys.push(jQuery.extend(true, {}, bone.keys[bone.keys.length-1]));
						bone.keys[bone.keys.length-1].time = 1.0;
					}

					transX = transY = transZ = 0;

					mesh++;
				}
				//if (frame-sframe > frameStep)
				//console.log('id', moveable.objectID, ' anim', anm, ' key', key, ' frameStep', frameStep, ' diff', frame-sframe)
			}

			animations.push({ 
				"name": 		"anim" + anm,
				"fps": 			animFPS, 
				"length": 		animLength, 
				"hierarchy": 	animBones,
				"numFrames":  	numFrames,
				"numKeys":      animNumKeys,
				"frameRate":   	anim.frameRate
			});
		}

		this.sc.animations = animations;
	},

	createMoveables : function () {

		var numMoveables = 0;
		for (var m = 0; m < this.trlevel.moveables.length; ++m) {
			var moveable = this.trlevel.moveables[m];

			var numMeshes = moveable.numMeshes, meshIndex = moveable.startingMesh, meshTree = moveable.meshTree;
			var isDummy = numMeshes == 1 && this.trlevel.meshes[meshIndex].dummy;

			if (this.sc.geometries['moveable' + moveable.objectID] || isDummy) continue;

			var meshJSON = this.createNewJSONEmbed();
			var attributes = {
				flags: { type:"v4", value:[] }
			};
			var tiles2material = {};
			var stackIdx = 0, stack = [], parent = -1;
			var px = 0, py = 0, pz = 0, ofsvert = 0, bones = [], skinIndices = [], skinWeights = [];

			for (var idx = 0; idx < numMeshes; ++idx, meshIndex++) {
				if (idx != 0) {
					var sflag = this.trlevel.meshTrees[meshTree++].coord;
					px = this.trlevel.meshTrees[meshTree++].coord;
					py = this.trlevel.meshTrees[meshTree++].coord;
					pz = this.trlevel.meshTrees[meshTree++].coord;
					if (sflag & 1) {
						if (stackIdx == 0) stackIdx = 1; // some moveables can have stackPtr == -1 without this test... (look in joby1a.tr4 for eg)
						parent = stack[--stackIdx];
					}
					if (sflag & 2) {
						stack[stackIdx++] = parent;
					}
				}

				var mesh = this.trlevel.meshes[meshIndex];

				this.makeMeshGeometry(mesh, meshIndex, meshJSON, tiles2material, this.trlevel.objectTextures, this.trlevel.mapObjTexture2AnimTexture, ofsvert, attributes, idx, skinIndices, skinWeights);

				ofsvert = parseInt(meshJSON.vertices.length/3);

				bones.push({
					"parent": parent,
					"name": "mesh#" + meshIndex,
					"pos": [ 0, 0, 0 ],
					"pos_init": [ px, -py, -pz ],
					"rotq": [ 0, 0, 0, 1]
				});

				parent = idx;
			}

			meshJSON.bones = bones;
			meshJSON.skinIndices = skinIndices;
			meshJSON.skinWeights = skinWeights;

			meshJSON._materials = this.makeMaterialList(tiles2material, attributes, 'moveable');
			for (var mat = 0; mat < meshJSON._materials.length; ++mat) {
				meshJSON._materials[mat].uniforms.lighting = { type: "f", value: 0.0 }
			}

			this.sc.embeds['moveable' + moveable.objectID] = meshJSON;
			this.sc.geometries['moveable' + moveable.objectID] = {
				"type": "embedded",
				"id"  : "moveable" + moveable.objectID
			};

			numMoveables++;
		}

		console.log('Num moveables=', numMoveables)
	},

	createItems : function () {
		var mapObjID2Index = {};

		for (var m = 0; m < this.trlevel.moveables.length; ++m) {
			var moveable = this.trlevel.moveables[m];
			mapObjID2Index[moveable.objectID] = m;
		}

		var numMoveableInstances = 0;
		for (var i = 0; i < this.trlevel.items.length; ++i) {
			var item = this.trlevel.items[i];
			var m = mapObjID2Index[item.objectID];
			if (m == null) continue; // not a moveable

			var roomIndex = item.room, lighting = item.intensity1, room = this.trlevel.rooms[roomIndex];
			var moveable = this.trlevel.moveables[m];

			var objIDForVisu = this.confMgr.levelNumber(this.sc.levelShortFileName, 'moveables > moveable[id="' + moveable.objectID + '"] > visuid', true, moveable.objectID);

			var hasGeometry = this.sc.embeds['moveable' + objIDForVisu];
			var materials = null;
			if (hasGeometry) {
				materials = [];
				for (var mat = 0; mat < this.sc.embeds['moveable' + objIDForVisu]._materials.length; ++mat) {
					var material = jQuery.extend(true, {}, this.sc.embeds['moveable' + objIDForVisu]._materials[mat]);
					if (lighting != -1) {
						// item is internally lit
						material.uniforms.lighting.value = this.convertIntensity(item.intensity1);
					} else {
						// change material to a material that handles lights
						material.material = this.getMaterial('moveable', room.lights.length);
						material.uniforms.lighting.value = 1.0;
					}
					materials.push(material);
				}
			}

			var q = new THREE.Quaternion();
			q.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad(-(item.angle >> 14) * 90) );

			this.sc.objects['item' + i] = {
				"geometry" : hasGeometry ? "moveable" + objIDForVisu : null,
				"material" : materials,
				"position" : [ item.x, -item.y, -item.z ],
				"quaternion" : [ q.x, q.y, q.z, q.w ],
				"scale"	   : [ 1, 1, 1 ],
				"visible"  : !room.isAlternate,
				"moveable" : moveable.objectID,
				"has_anims": true,
				"roomIndex": roomIndex,
				"animationStartIndex": moveable.animation,
				"isAlternateRoom" : room.isAlternate,
				"skin"	: true,
				"use_vertex_texture" : false
			};

			numMoveableInstances++;
		}

		// specific handling of the sky
		var skyId = this.confMgr.levelNumber(this.sc.levelShortFileName, 'sky > objectid', true, 0);
		if (skyId && mapObjID2Index[skyId]) {
			moveable = this.trlevel.moveables[mapObjID2Index[skyId]];
			var materials = [];
			for (var mat = 0; mat < this.sc.embeds['moveable' + moveable.objectID]._materials.length; ++mat) {
				var material = jQuery.extend(true, {}, this.sc.embeds['moveable' + moveable.objectID]._materials[mat]);
				material.uniforms.lighting.value = 1.0;
				material.depthWrite = false;
				//material.depthTest = false;
				materials.push(material);
			}

			var skyNoAnim = this.confMgr.levelBoolean(this.sc.levelShortFileName, 'sky > noanim', true, false);
			this.sc.objects['sky'] = {
				"geometry" : "moveable" + moveable.objectID,
				"material" : materials,
				"position" : [ 0, 0, 0 ],
				"quaternion" : [ 0, 0, 0, 1 ],
				"scale"	   : [ 1, 1, 1 ],
				"visible"  : true,
				"moveable" : moveable.objectID,
				"animationStartIndex": moveable.animation,
				"has_anims": !skyNoAnim,
				"skin"	: true,
				"use_vertex_texture" : false
			};
			numMoveableInstances++;	
		}

		console.log('Num moveable instances=', numMoveableInstances)
	},

	convert : function (trlevel, callback_created) {
		this.trlevel = trlevel;

		this.sc =  {
			"metadata": {
				"formatVersion": 3.2,
				"type" : "scene"
			},

			"urlBaseType" : "relativeToHTML",

			"objects": { },
			
			"geometries": {	},
			
			"materials": { },
			
			"textures": { },
			
			"embeds": { },

			"defaults": {
				"camera": "camera1",
				"fog": false
			},

			"cutScene": {
				"origin" : {},
				"curFrame" : 0,
				"frames" : null,
				"sound" : null,
				"animminid" : 0,
				"animmaxid" : 0
			}
		};

		this.sc.levelFileName = this.trlevel.filename;
		this.sc.levelShortFileNameOrig = this.sc.levelFileName.substring(0, this.sc.levelFileName.indexOf('.'));
		this.sc.levelShortFileName = this.sc.levelShortFileNameOrig.toLowerCase();
		this.sc.waterColor = {
			"in" : this.confMgr.globalColor('water > colorin'),
			"out" : this.confMgr.globalColor('water > colorout')
		};
		this.sc.texturePath = "TRN/texture/" + this.trlevel.rversion.toLowerCase() + "/";
		this.sc.soundPath = "TRN/sound/" + this.trlevel.rversion.toLowerCase() + "/";

		TRN.ObjectID.Lara = this.confMgr.levelNumber(this.sc.levelShortFileName, 'lara > id', true, 0);

		// get Lara's position => camera starting point
		var laraPos = { x:0, y:0, z:0, rotY:0 };
		for (var i = 0; i < this.trlevel.items.length; ++i) {
			var item = this.trlevel.items[i];
			if (item.objectID == TRN.ObjectID.Lara) {
				laraPos.x = item.x;
				laraPos.y = -item.y;
				laraPos.z = -item.z;
				laraPos.rotY = -(item.angle >> 14) * 90;
				break;
			}
		}

		var laraAngle = this.confMgr.levelFloat(this.sc.levelShortFileName, 'moveables > moveable[id="' + TRN.ObjectID.Lara + '"] > angle');
		if (laraAngle != undefined) {
			laraPos.rotY = laraAngle;
		}

		if (this.trlevel.numCinematicFrames > 0) {
			this.sc.cutScene.frames = this.trlevel.cinematicFrames;
			this.sc.cutScene.origin = laraPos;
			this.sc.cutScene.animminid = this.confMgr.levelNumber(this.sc.levelShortFileName, 'cutscene > animminid', true, 0);
			this.sc.cutScene.animmaxid = this.confMgr.levelNumber(this.sc.levelShortFileName, 'cutscene > animmaxid', true, 0);
		}	

		var camPos = { x:laraPos.x, y:laraPos.y, z:laraPos.z, rotY:laraPos.rotY }
		if (!this.sc.cutScene.frames) {
			var ofstDir = this.confMgr.levelFloat(this.sc.levelShortFileName, 'moveables > moveable[id="' + TRN.ObjectID.Lara + '"] > behaviour[name="Lara"] > dirdist', true, 0.0);
			var ofstUp = this.confMgr.levelFloat(this.sc.levelShortFileName, 'moveables > moveable[id="' + TRN.ObjectID.Lara + '"] > behaviour[name="Lara"] > updist', true, 0.0);

			var v3 = new THREE.Vector3(0, ofstUp, ofstDir);
			var q = new THREE.Quaternion();

			q.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad(laraPos.rotY) );
			v3.applyQuaternion(q);

			camPos.x += v3.x;
			camPos.y += v3.y;
			camPos.z += v3.z;
		}

		var q = new THREE.Quaternion();

		q.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad(laraPos.rotY) );
		
		this.sc.objects.camera1 = {
			"type"  : "PerspectiveCamera",
			"fov"   : this.confMgr.levelFloat(this.sc.levelShortFileName, 'camera > fov', true, 50),
			"near"  : this.confMgr.levelFloat(this.sc.levelShortFileName, 'camera > neardist', true, 50),
			"far"   : this.confMgr.levelFloat(this.sc.levelShortFileName, 'camera > fardist', true, 10000),
			"position": [ camPos.x, camPos.y, camPos.z ],
			"quaternion": [ q.x, q.y, q.z, q.w ]
		}

		this.createTextures();

		this.createAnimatedTextures();

		this.createRooms();

		this.createMoveables();

		this.createItems();

		this.createAnimations();

		return this.sc;

	}
}
