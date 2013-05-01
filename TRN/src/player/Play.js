var camera, scene, sceneJSON, renderer, stats, controls, startTime = -1;
var clock = new THREE.Clock();

var trlevel_; // debug only => to be removed

function errorHandler(e) {
  var msg = '';

  switch (e.code) {
    case FileError.QUOTA_EXCEEDED_ERR:
      msg = 'QUOTA_EXCEEDED_ERR';
      break;
    case FileError.NOT_FOUND_ERR:
      msg = 'NOT_FOUND_ERR';
      break;
    case FileError.SECURITY_ERR:
      msg = 'SECURITY_ERR';
      break;
    case FileError.INVALID_MODIFICATION_ERR:
      msg = 'INVALID_MODIFICATION_ERR';
      break;
    case FileError.INVALID_STATE_ERR:
      msg = 'INVALID_STATE_ERR';
      break;
    default:
      msg = 'Unknown Error';
      break;
  };

  console.log('requestFileSystem Error: ' + msg);
}

function show(trlevel) {
	if (typeof(trlevel) == 'string') {

		var isZip = trlevel.indexOf('.zip') >= 0;
	    var request = new XMLHttpRequest();
	    request.open("GET", trlevel, true);
	    request.responseType = isZip ? "arraybuffer" : "text";
	    request.onerror = function() {
	        console.log('Read level: XHR error', request.status, request.statusText);
	    }

	    request.onreadystatechange = function() {
	        if (request.readyState != 4) return;

	        if (request.status != 200) {
		   		console.log('Could not read the level', trlevel, request.status, request.statusText);
	        } else {
	        	if (isZip) {
		        	console.log('Level', trlevel, 'loaded. Unzipping...');
		    		var zip = new JSZip();
		    		zip.load(request.response);
		    		var f = zip.file('level');
		    		sceneJSON = JSON.parse(f.asText());//eval('[' + f.asText() + ']')[0];
		    		console.log('Level unzipped.');
		    	} else {
		    		sceneJSON = JSON.parse(request.response);
		    	}
	    		init();
	        }
	    }

		request.send();

	} else {
		trlevel_ = trlevel;

		var converter = new TRN.LevelConverter(trlevel.confMgr);

		var sc = converter.convert(trlevel);

		if (false) {
			ssc = JSON.stringify(sc);
			console.log(ssc)
		    /*var zip = new JSZip();
		    zip.file("level", ssc);
		    var content = zip.generate({compression:'DEFLATE', type:'blob'});
		    console.log(ssc.length, content.size)

			var requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
			if (requestFileSystem) {
				console.log('requestFileSystem found !');

				window.webkitStorageInfo.requestQuota(PERSISTENT, 100*1024*1024, function(grantedBytes) {
					requestFileSystem(window.PERSISTENT, 100*1024*1024, function(fs) { 

						fs.root.getFile(sc.levelShortFileName + '.zip', { create:true, exclusive:false }, function(fileEntry) {
						    fileEntry.createWriter(function(fileWriter) {

						      fileWriter.onwriteend = function(e) {
						        console.log('Write completed.');
						      };

						      fileWriter.onerror = function(e) {
						        console.log('Write failed: ' + e.toString());
						      };

						      // Create a new Blob and write it to log.txt.
						      //var blob = new Blob(content, {type: 'application/octet-stream'});

						      fileWriter.write(content);

						    }, errorHandler);					
						}, errorHandler);
					}, errorHandler);
				});
			}*/
		}

		sceneJSON = sc;
		if (sc.cutScene.frames) {
			var context = typeof(webkitAudioContext) != 'undefined' ? new webkitAudioContext() : typeof(AudioContext) != 'undefined' ? new AudioContext() : null;
			if (context != null) {
				var bufferLoader = new BufferLoader(
					context,
					[
					  sc.soundPath + sc.levelShortFileName.toUpperCase(),
					],
					function finishedLoading(bufferList, err) {
						if (bufferList != null && bufferList.length > 0) {
							sc.cutScene.sound = context.createBufferSource();
							sc.cutScene.sound.buffer = bufferList[0];
							sc.cutScene.sound.connect(context.destination);
						} else {
							console.log('Error when loading sound. ', err);
						}
						init();
					}
				);
				bufferLoader.load();
			} else {
				init();
			}
		} else {
			init();
		}
	}
}

function showInfo() {
	jQuery('#currentroom').html(sceneJSON.curRoom);
	jQuery('#numlights').html(sceneJSON.curRoom != -1 ? sceneJSON.objects['room'+sceneJSON.curRoom].lights.length : '');
	jQuery('#camerapos').html(camera.position.x.toFixed(12)+','+camera.position.y.toFixed(12)+','+camera.position.z.toFixed(12));
	jQuery('#camerarot').html(camera.quaternion.x.toFixed(12)+','+camera.quaternion.y.toFixed(12)+','+camera.quaternion.z.toFixed(12)+','+camera.quaternion.w.toFixed(12));
}

function init() {

	var container = document.getElementById( 'container' );

	if (renderer) {
		container.removeChild(renderer.domElement);
	}
	
	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize( window.innerWidth, window.innerHeight );
	//renderer.sortObjects = false;

	container.appendChild( renderer.domElement );

	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.top = '0px';
	stats.domElement.style.right = '0px';
	stats.domElement.style.zIndex = 100;
	container.appendChild( stats.domElement );

	var loader = new THREE.SceneLoader();
	//loader.callbackSync = callbackSync;
	//loader.callbackProgress = callbackProgress;

	//loader.load(sceneJSON, callbackFinished);
	loader.parse(sceneJSON, callbackFinished, '');

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

	render();

}

function registerAnimation(objectID, animIndex, useOrigAnimation) {

	var anim = THREE.AnimationHandler.get(objectID + '_anim' + animIndex);
	if (anim != null) return anim;

	anim = useOrigAnimation ? sceneJSON.animations[animIndex] : jQuery.extend(true, {}, sceneJSON.animations[animIndex]);

	var mesh = sceneJSON.embeds['moveable' + objectID];
	var bones = mesh.bones;

	for (var b = 0; b < bones.length; ++b) {
		if (b < anim.hierarchy.length) {
			anim.hierarchy[b].parent = bones[b].parent;
			for (var k = 0; k < anim.hierarchy[b].keys.length; ++k) {
				var pos = anim.hierarchy[b].keys[k].pos;
				pos[0] += bones[b].pos_init[0];
				pos[1] += bones[b].pos_init[1];
				pos[2] += bones[b].pos_init[2];
			}
		} else {
			console.log("Problem when creating anim #" + animIndex + " for moveable with objectId " + objectID +
				": there are more bones (" + bones.length + ") in the moveable than in the anim (" + anim.hierarchy.length + ") !");
		}
	}

	anim.hierarchy.length = bones.length; // in case there are more bones in the anim than in the mesh
	anim.name = objectID + '_anim' + animIndex;

	THREE.AnimationHandler.add( anim );

	return anim;	
}

function callbackFinished(result) {

	scene = result;

	jQuery('#wireframemode').on('click', function() {
		for (var objID in scene.objects) {
			var obj = scene.objects[objID];
			if (!(obj instanceof THREE.Mesh)) continue;

			var materials = obj.material.materials;
			if (!materials || !materials.length) continue;

			for (var i = 0; i < materials.length; ++i) {
				var material = materials[i], userData = material.userData;
				material.wireframe = this.checked;
			}
		}
	});

	jQuery('#usefog').on('click', function() {
		var shaderMgr = new TRN.ShaderMgr();
		for (var objID in scene.objects) {
			var obj = scene.objects[objID];
			if (!(obj instanceof THREE.Mesh)) continue;

			var materials = obj.material.materials;
			if (!materials || !materials.length) continue;

			for (var i = 0; i < materials.length; ++i) {
				var material = materials[i], userData = material.userData;
				material.fragmentShader = shaderMgr.getFragmentShader(this.checked ? 'standard_fog' : 'standard');
				material.needsUpdate = true;
			}
		}
	});

	jQuery('#nolights').on('click', function() {
		var shaderMgr = new TRN.ShaderMgr();
		for (var objID in scene.objects) {
			var obj = scene.objects[objID];
			if (!(obj instanceof THREE.Mesh)) continue;

			var materials = obj.material.materials;
			if (!materials || !materials.length) continue;

			for (var i = 0; i < materials.length; ++i) {
				var material = materials[i], origMatName = material.origMatName;
				if (!origMatName) {
					origMatName = material.origMatName = material.name;
					material.origVertexShader = material.vertexShader;
				}
				if (origMatName.indexOf('_l') < 0) continue;

				material.vertexShader = this.checked ? shaderMgr.getVertexShader('moveable') : material.origVertexShader;
				material.needsUpdate = true;
			}
		}
	});

	jQuery('#fullscreen').on('click', function() {
		if (document.fullscreenElement != null) {
			if (document.exitFullscreen) 
				document.exitFullscreen();
		} else if (document.body.requestFullscreen) {
			document.body.requestFullscreen();
		}
	});

    var prefix = ['', 'webkit', 'moz'];
    for (var i = 0; i < prefix.length; ++i) {
    	document.addEventListener(prefix[i] + "fullscreenchange", function() {
    		jQuery('#fullscreen').prop('checked', document.fullscreenElement != null);
    	}, false);
    }

	// make sure the sky is displayed first
	if (scene.objects.sky) {
		scene.objects.sky.renderDepth = -1e10;
		//scene.objects.sky.frustumCulled = false;
	}

	// initialize the animated textures
	scene.animatedTextures = sceneJSON.animatedTextures;
	if (scene.animatedTextures) {
		for (var i = 0; i < scene.animatedTextures.length; ++i) {
			var animTexture = scene.animatedTextures[i];
			animTexture.progressor = new SequenceProgressor(animTexture.animcoords.length, 1.0/animTexture.animspeed);
		}
	}

	// update position/quaternion for some specific items if we play a cut scene
	if (sceneJSON.cutScene.frames) {
		var min = sceneJSON.cutScene.animminid;
		var max = sceneJSON.cutScene.animmaxid;
		for (var objID in scene.objects) {
			var obj = scene.objects[objID];
			var objJSON = sceneJSON.objects[objID];

			if (objID.substr(0, 4) == 'item' && (objJSON.moveable == TRN.ObjectID.Lara || (objJSON.moveable >= min && objJSON.moveable <= max))) {
				obj.position.set(sceneJSON.cutScene.origin.x, sceneJSON.cutScene.origin.y, sceneJSON.cutScene.origin.z);
				var q = new THREE.Quaternion();
				q.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad(sceneJSON.cutScene.origin.rotY) );
				obj.quaternion = q;
			}
		}
	}

	// start anim #0 for meshes with animations
	if (sceneJSON.animations) {
		for (var objID in scene.objects) {
			var obj = scene.objects[objID];
			var objJSON = sceneJSON.objects[objID];

			if (!objJSON.has_anims) continue;

			if (sceneJSON.cutScene.frames) {
				var animator = function(obj, animIndex, objectID) {
					var curAnim = animIndex;
					return function(remainingTime) {
						var scurAnim = curAnim;

						curAnim = trlevel_.animations[scurAnim].nextAnimation;

						var nextFrame = trlevel_.animations[scurAnim].nextFrame - trlevel_.animations[curAnim].frameStart;

						if (scurAnim == curAnim) return;

						remainingTime += nextFrame / TRN.baseFrameRate;

						var anim = registerAnimation(objectID, curAnim, true);
						var animation = new THREE.Animation( obj, anim.name, THREE.AnimationHandler.LINEAR, this.callbackfn);

						animation.play( false, remainingTime );
						animation.update(0);
					}
				};

				// register all animations we will need in the cut scene
				var registered = {}, anmIndex = objJSON.animationStartIndex;
				while (true) {
					if (registered[anmIndex]) break;
					
					registered[anmIndex] = true;
					registerAnimation(objJSON.moveable, anmIndex, true);

					anmIndex = trlevel_.animations[anmIndex].nextAnimation;
				}

				var anim = registerAnimation(objJSON.moveable, objJSON.animationStartIndex, true);
				var animation = new THREE.Animation( obj, anim.name, THREE.AnimationHandler.LINEAR, animator(obj, objJSON.animationStartIndex, objJSON.moveable));

				animation.play( false );
				animation.update(0);

			} else {
				var anim = registerAnimation(objJSON.moveable, objJSON.animationStartIndex);
				var animation = new THREE.Animation( obj, anim.name, THREE.AnimationHandler.LINEAR );

				animation.play( true, Math.random()*anim.length );
				animation.update(0);
			}
		}
	}

	// Set all objects except camera as auto update=false
	for (var objID in scene.objects) {
		var obj = scene.objects[objID];
		var objJSON = sceneJSON.objects[objID];

		if (!objJSON.has_anims && objID.indexOf('camera') < 0 && objID != 'sky') {
			obj.updateMatrix();
			obj.matrixAutoUpdate = false;
		}
	}

	// don't flip Y coordinates in textures
	for (var texture in scene.textures) {
		if (!scene.textures.hasOwnProperty(texture)) continue;
		scene.textures[texture].flipY = false;
	}

	// create the material for each mesh and set the loaded texture in the ShaderMaterial materials
	for (var objID in scene.objects) {
		var obj = scene.objects[objID];
		var objJSON = sceneJSON.objects[objID];

		if (!(obj instanceof THREE.Mesh)) continue;

		obj.geometry.computeBoundingBox();
		obj.frustumCulled = !sceneJSON.cutScene.frames; // hack because bounding spheres are not recalculated for skinned objects

		var material = new THREE.MeshFaceMaterial();
		obj.material = material;

		obj.geometry.computeFaceNormals();
		obj.geometry.computeVertexNormals();

		for (var mt_ = 0; mt_ < objJSON.material.length; ++mt_) {
			var elem = objJSON.material[mt_];
			if (typeof(elem) == 'string') {
				material.materials[mt_] = scene.materials[elem];
			} else {
				material.materials[mt_] = scene.materials[elem.material].clone();
				if (elem.uniforms) {
					material.materials[mt_].uniforms = THREE.UniformsUtils.merge([material.materials[mt_].uniforms, elem.uniforms]);
				}
				if (elem.attributes) {
					material.materials[mt_].attributes = elem.attributes;
					material.materials[mt_].attributes.flags.needsUpdate = true;
				}
				for (var mkey in elem) {
					if (!elem.hasOwnProperty(mkey) || mkey == 'uniforms' || mkey == 'attributes') continue;
					material.materials[mt_][mkey] = elem[mkey];
				}
			}
		}
		var materials = material.materials;
		if (!materials || !materials.length) continue;
		for (var i = 0; i < materials.length; ++i) {
			var material = materials[i];
			if (material instanceof THREE.ShaderMaterial) {
				if (material.uniforms.map && typeof(material.uniforms.map.value) == 'string' && material.uniforms.map.value) {
					material.uniforms.map.value = scene.textures[material.uniforms.map.value];
				}
				if (objJSON.filledWithWater) {
					material.uniforms.tintColor.value = new THREE.Vector3(sceneJSON.waterColor.in.r, sceneJSON.waterColor.in.g, sceneJSON.waterColor.in.b);
				}
				if (typeof(objJSON.roomIndex) != 'undefined') {
					var room = sceneJSON.objects['room' + objJSON.roomIndex];
					if (room) {
						material.uniforms.ambientColor.value = room.ambientColor;
						material.uniforms.pointLightPosition = { type: "v3v", value: [] };
						material.uniforms.pointLightColor = { type: "v3v", value: [] };
						material.uniforms.pointLightDistance = { type: "f", value: [] };
						for (var l = 0; l < room.lights.length; ++l) {
							var light = room.lights[l];
							material.uniforms.pointLightPosition.value[l] = new THREE.Vector3(light.x, light.y, light.z);
							material.uniforms.pointLightColor.value[l] = light.color;
							material.uniforms.pointLightDistance.value[l] = light.fadeOut;
						}
					}
				}
				if (material.hasAlpha) {
					isTransparent = true;
					material.transparent = true;
					material.blending = THREE.AdditiveBlending;
					material.blendSrc = THREE.OneFactor;
					material.blendDst = THREE.OneMinusSrcColorFactor;
					material.depthWrite = false;
					material.needsUpdate = true;
				}
			}
		}
	}

/*	handle_update( result, 1 );

	result.scene.traverse( function ( object ) {
		if ( object.properties.rotating === true ) {

			rotatingObjects.push( object );

		}
	} );
*/
	camera = scene.currentCamera;
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	if (true) {
		// keel
		//camera.position.set(63514.36027899013,-3527.280854978113,-57688.901507514056);
		//camera.quaternion.set(-0.050579906399909495,-0.2148394919749775,-0.011142047403773734,0.9752750999262544);
		// wall
		//camera.position.set(26691.903842411888,880.9278880595274,-36502.99612845005);
		//camera.quaternion.set(-0.024892277143903293,0.6595324248145452,0.02186211933470944,0.7509456723991692);
		//camera.position.set(88862.25062021082,-19699.75129100216,-71066.57072532139);
		//camera.quaternion.set(0.019547182878385066,-0.9796215753522257,-0.16025495204163037,-0.1194898618798845);
		//camera.position.set(27301.841933835174,5789.926107567453,-40251.631452191861);
		//camera.quaternion.set(-0.014785860024,-0.951336377231,-0.046225492867,0.304306567275);
		// unwater
		//camera.position.set(80344.23082910081,5708.199004460822,-48651.619581856896);
		//camera.quaternion.set(0.005487008774905242,0.9860915773002777,0.16275151654342634,-0.03324511655818078);
	}

	camera.updateMatrix();
	camera.updateMatrixWorld();
	
	var elem = document.body;

	controls = new BasicControls( camera, elem );

	TRN.bindRequestPointerLock(elem);
	TRN.bindRequestFullscreen(elem);

	window.addEventListener( 'resize', onWindowResize, false );

	if (sceneJSON.cutScene.frames != null) {
		TRN.startSound(sceneJSON.cutScene.sound);
	}

	animate();
}

function handle_update( result, pieces ) {
	return;
	var m, material, count = 0;
	for ( m in result.materials ) {
		material = result.materials[ m ];
		if ( ! ( material instanceof THREE.MeshFaceMaterial || material instanceof THREE.ShaderMaterial || material.morphTargets ) ) {
			if( !material.program ) {
				renderer.initMaterial( material, result.scene.__lights, result.scene.fog );
				count += 1;
				if( count > pieces ) {
					//console.log("xxxxxxxxx");
					break;
				}
			}
		}
	}
}

var quantum = 1000/TRN.baseFrameRate, quantumTime = (new Date()).getTime(), quantumRnd = 0;

function animate() {

	requestAnimationFrame( animate );

	var curTime = (new Date()).getTime();
	if (startTime == -1) startTime = curTime;
	if (curTime - quantumTime > quantum) {
		quantumRnd = Math.random();
		quantumTime = curTime;
	}

	curTime = curTime - startTime;

	var delta = clock.getDelta();

	THREE.AnimationHandler.update( delta );

	controls.update(delta);
	
	if (sceneJSON.cutScene.frames != null) {
		sceneJSON.cutScene.curFrame += TRN.baseFrameRate * delta;
		var cfrm = parseInt(sceneJSON.cutScene.curFrame);
		if (cfrm < sceneJSON.cutScene.frames.length) {
			var frm1 = sceneJSON.cutScene.frames[cfrm];
			var fov = frm1.fov * 70.0 / 16384.0;
			var roll = -frm1.roll * 180.0 / 32768.0;
			if (!controls.captureMouse) {

				var q = new THREE.Quaternion();
				q.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad(sceneJSON.cutScene.origin.rotY) );

				var lkat = new THREE.Vector3(frm1.targetX, -frm1.targetY, -frm1.targetZ);
				lkat.applyQuaternion(q);

				camera.fov = fov;
				camera.position.set(frm1.posX, -frm1.posY, -frm1.posZ);
				camera.position.applyQuaternion(q);
				camera.lookAt(lkat);
				camera.position.add(sceneJSON.cutScene.origin);
				camera.quaternion.multiplyQuaternions(q.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad(roll) ), camera.quaternion);
				camera.updateProjectionMatrix();
			}
		} else {
			sceneJSON.cutScene.frames = null;
		}
	}

	camera.updateMatrixWorld();

	if (scene.objects.sky) {
		scene.objects.sky.position = camera.position;
	}

	if (scene.animatedTextures) {
		for (var i = 0; i < scene.animatedTextures.length; ++i) {
			var animTexture = scene.animatedTextures[i];
			animTexture.progressor.update(delta);
		}
	}

	var singleRoomMode = jQuery('#singleroommode').prop('checked');

	sceneJSON.curRoom = -1;

	for (var objID in scene.objects) {
		var obj = scene.objects[objID], objJSON = sceneJSON.objects[objID];
		if (objJSON.isRoom) {
			if (obj.geometry.boundingBox.containsPoint(camera.position) && !objJSON.isAlternateRoom) {
				sceneJSON.curRoom = objJSON.roomIndex;
			}
		}
		if (singleRoomMode) {
			obj.visible = objJSON.roomIndex == sceneJSON.curRoom && !objJSON.isAlternateRoom;
		} else {
			obj.visible = !objJSON.isAlternateRoom;
		}

		if (!(obj instanceof THREE.Mesh)) continue;

		if (objJSON.isSprite) {
			// make sure the object is always facing the camera
			obj.quaternion.set(camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w);

			obj.updateMatrix();
			obj.updateMatrixWorld();
		}

		var materials = obj.material.materials;
		if (!materials || !materials.length) continue;
		for (var i = 0; i < materials.length; ++i) {
			var material = materials[i], userData = material.userData;
			if (material instanceof THREE.ShaderMaterial) {
				material.uniforms.curTime.value = curTime;
				material.uniforms.rnd.value = quantumRnd;
				if (userData.animatedTexture) {
					var animTexture = scene.animatedTextures[userData.animatedTexture.idxAnimatedTexture];
					var coords = animTexture.animcoords[(animTexture.progressor.currentTile + userData.animatedTexture.pos) % animTexture.animcoords.length];
					material.uniforms.map.value = scene.textures[coords.texture];
					material.uniforms.offsetRepeat.value.x = coords.minU;
					material.uniforms.offsetRepeat.value.y = coords.minV;
				}
			}
		}
	}

	render();
}

function SequenceProgressor(numTiles, tileDispDuration) 
{	
	this.numberOfTiles = numTiles;
	this.tileDisplayDuration = tileDispDuration;

	// how long has the current image been displayed?
	this.currentDisplayTime = 0;

	// which image is currently being displayed?
	this.currentTile = 0;
		
	this.update = function(milliSec) {
		this.currentDisplayTime += milliSec;
		while (this.currentDisplayTime > this.tileDisplayDuration) {
			this.currentDisplayTime -= this.tileDisplayDuration;
			this.currentTile++;
			if (this.currentTile == this.numberOfTiles)
				this.currentTile = 0;
		}
	};
}		

function render() {
	renderer.render( scene.scene, camera );
	stats.update();
	showInfo();
}
