class Ship{
  constructor(team, mesh, position, velocity){
    this.up = new THREE.Vector3(0,1,0);
    this.forces = new THREE.Vector3(0,0,0);
    this.sector = {};
    this.team = team;

    if(position != undefined){
      this.mesh = mesh;
    }else{
      this.mesh = new THREE.Mesh(new THREE.ConeGeometry(1, 2, 4, 1), material);
    }
    if(position != undefined){
      this.mesh.position.set(position.x, position.y, position.z);
    }else{
      this.mesh.position.set(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5);
    }
    if(velocity != undefined){
      this.velocity = velocity;
    }else{
      this.velocity = new THREE.Vector3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5);
    }

    this.cohesionForces = [];
    this.separationForces = [];
    this.alignmentForces = [];

    this.cohesionWeight = 0.0005;
    this.separationWeight = 0.01;
    this.alignmentWeight = 0.008;
    this.boundingWeight = 0.00001;

    this.maxVelocity = 0.25;
    this.influenceRange = 20.0;
    this.influenceAngle = -0.7;
    this.separationDistance = 8.0;

    scene.add(this.mesh);
  }

  clone(){
    return JSON.parse(JSON.stringify(this));
  }

  updateSector(){
    this.sector.x = Math.floor(this.mesh.position.x / this.influenceRange);
    this.sector.y = Math.floor(this.mesh.position.y / this.influenceRange);
    this.sector.z = Math.floor(this.mesh.position.z / this.influenceRange);
    let key = "x" + this.sector.x + "y" + this.sector.y + "z" + this.sector.z + "t" + this.team;

    if(sectors.get(key) == undefined){
      sectors.set(key, []);
    }
    sectors.get(key).push(this);
  }

  computeForcesWorking(){
    let influenceArea = [];
    for(let x = -1; x <= 1; x++){
      for(let y = -1; y <= 1; y++){
        for(let z = -1; z <= 1; z++){
          influenceArea.push(sectors.get(
            "x" + (this.sector.x + x) +
            "y" + (this.sector.y + y) +
            "z" + (this.sector.z + z) +
            "t" + this.team
          ));
        }
      }
    }

    influenceArea.forEach((sector) => {
      if(sector != undefined){
        sector.forEach((neighbour, index) => {
          //check if isnt yourself
          if(neighbour.mesh.geometry.uuid != this.mesh.geometry.uuid){
            //check influence sphere
            let distVect = neighbour.mesh.position.clone().sub(this.mesh.position);
            let distSq = distVect.clone().lengthSq();
            if(distSq < (this.influenceRange * this.influenceRange)){

              //compute separation
              if(distSq < (this.separationDistance * this.separationDistance)){
                let separation = distVect.clone().normalize();
                separation.multiplyScalar(this.separationDistance);
                separation.sub(distVect);
                this.separationForces.push(separation.clone().negate());
              }

              //check if it is within the viewing angle
              if(this.velocity.dot(neighbour.mesh.position) > this.influenceAngle){
                //compute cohesion
                this.cohesionForces.push(distVect.clone());

                //compute alignment
                this.alignmentForces.push(neighbour.velocity.clone());
              }
            }
          }
        });
      }
    });
  }

  computeForces(){
    let influenceArea = [];
    for(let x = -1; x <= 1; x++){
      for(let y = -1; y <= 1; y++){
        for(let z = -1; z <= 1; z++){
          influenceArea.push(sectors.get(
            "x" + (this.sector.x + x) +
            "y" + (this.sector.y + y) +
            "z" + (this.sector.z + z) +
            "t" + this.team
          ));
        }
      }
    }

    influenceArea.forEach((sector) => {
      if(sector != undefined){
        let neighbourIndex;
        sector.forEach((neighbour, index) => {
          if(neighbour != undefined){
            //check if isnt yourself
            if(neighbour.mesh.geometry.uuid != this.mesh.geometry.uuid){
              //check influence sphere
              let distVect = neighbour.mesh.position.clone().sub(this.mesh.position);
              let distSq = distVect.clone().lengthSq();
              if(distSq < (this.influenceRange * this.influenceRange)){

                //compute separation
                if(distSq < (this.separationDistance * this.separationDistance)){
                  let separation = distVect.clone().normalize();
                  separation.multiplyScalar(this.separationDistance);
                  separation.sub(distVect);
                  this.separationForces.push(separation.clone().negate());
                  neighbour.separationForces.push(separation.clone());
                }

                //check if it is within the viewing angle
                if(this.velocity.dot(neighbour.mesh.position) > this.influenceAngle){
                  //compute cohesion
                  this.cohesionForces.push(distVect.clone());

                  //compute alignment
                  this.alignmentForces.push(neighbour.velocity.clone());
                }
                if(neighbour.velocity.dot(this.mesh.position) > neighbour.influenceAngle){
                  //compute cohesion
                  neighbour.cohesionForces.push(distVect.clone().negate());

                  //compute alignment
                  neighbour.alignmentForces.push(this.velocity.clone());
                }
              }
            }else{
              neighbourIndex = index;
            }
          }
        });
        sector[neighbourIndex] = undefined;
      }
    });
  }

  applyForces(){
    if(this.cohesionForces.length > 0){
      this.forces.set(0,0,0);
      this.cohesionForces.forEach((item) => {this.forces.add(item)});
      this.forces.multiplyScalar((1 / this.cohesionForces.length) * this.cohesionWeight);
      this.velocity.add(this.forces);
      this.cohesionForces = [];
    }

    if(this.separationForces.length > 0){
      this.forces.set(0,0,0);
      this.separationForces.forEach((item) => {this.forces.add(item)});
      this.forces.multiplyScalar(this.separationWeight);
      this.velocity.add(this.forces);
      this.separationForces = [];
    }

    if(this.alignmentForces.length > 0){
      this.forces.set(0,0,0);
      this.alignmentForces.forEach((item) => {this.forces.add(item)});
      this.forces.multiplyScalar((1 / this.alignmentForces.length) * this.alignmentWeight);
      this.velocity.add(this.forces);
      this.alignmentForces = [];
    }

    this.forces = this.mesh.position.clone().multiplyScalar(-this.boundingWeight);
    this.velocity.add(this.forces);

    this.velocity.clampLength(0,this.maxVelocity);
    this.mesh.position.add(this.velocity);
    this.mesh.quaternion.setFromUnitVectors(this.up, this.velocity.clone().normalize());
  }
}
