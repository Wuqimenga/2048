class Tile{
    constructor(position,value){
        this.x=position.x;
        this.y=position.y;
        this.value=value||2;

        this.previousPosition=null;
        this.mergedFrom=null;
    }

    savePosition(){
        this.previousPosition={x:this.x,y:this.y};
    }

    updatePostion(position){
        this.x=position.x;
        this.y=position.y;
    }
}

class Grid{
    constructor(size){
        this.size=size;
        this.cells=[];
        this.build();
    }

    build(){
        for(let x=0;x<this.size;x++){
            var row=this.cells[x]=[];
            for(let y=0;y<this.size;y++)
            {
                row.push(null);
            }
        }
    }

    randomAvailableCell(){
        var cells=this.availableCells();
        if(cells.length){
            return cells[Math.floor(Math.random()*cells.length)];
        }
    }

    availableCells(){
        var cells=[];
        this.eachCell((x,y,tile)=>{
            if(!tile){
                cells.push({x:x,y:y});
            }
        });

        return cells;
    }

    eachCell(callback){
        for(let x=0;x<this.size;x++){
            for(let y=0;y<this.size;y++){
                callback(x,y,this.cells[x][y]);
            }
        }
    }

    cellsAvailable(){
        return !!this.availableCells().length;
    }

    cellAvailable(cell){
        return !this.cellOccupied(cell);
    }

    cellOccupied(cell){
        return !!this.cellContent(cell);
    }

    cellContent(cell){
        if(this.withinBounds(cell)){
            return this.cells[cell.x][cell.y];
        }else{
            return null;
        }
    }

    insertTile(tile){
        this.cells[tile.x][tile.y]=tile;
    }

    removeTile(tile){
        this.cells[tile.x][tile.y]=null;
    }

    withinBounds(position){
        return position.x>=0 && position.x<this.size &&
               position.y>=0 && position.y<this.size;
    }
}

class KeyboardInputManager{
    constructor(){
        this.events={};
        this.listen();
    }

    on(event,callback){
        if(!this.events[event]){
            this.events[event]=[];
        }
        this.events[event].push(callback);
    }

    emit(event,data){
        var callbacks=this.events[event];
        if(callbacks){
            callbacks.forEach((callback)=>{
                callback(data);
            });
        }
    }

    listen(){
        var self=this;

        var map={
            38:0,
            39:1,
            40:2,
            37:3,
            75:0,
            76:1,
            74:2,
            72:3
        };
        document.addEventListener("keydown",(event)=>{
            var modifiers=event.altKey||event.ctrlKey||event.metaKey||
                          event.shiftKey;
            var mapped=map[event.which];

            if(!modifiers){
                if(mapped!==undefined){
                    event.preventDefault();
                    self.emit("move",mapped);
                }

                if(event.which===32){
                    self.restart.bind(self)(event);
                }
            }
        });

        var retry=document.getElementsByClassName("retry-button")[0];
        retry.addEventListener("click",this.restart.bind(this));

        var gestures=[Hammer.DIRECTION_UP,Hammer.DIRECTION_RIGHT,
                      Hammer.DIRECTION_DOWN,Hammer.DIRECTION_LEFT];
        
        var gameContainer=document.getElementsByClassName("game-container")[0];
        var handler=Hammer(gameContainer,{
            drag_block_horizontal:true,
            drag_block_vertical:true
        });

        handler.on("swipe",(event)=>{
            event.gesture.preventDefault();
            mapped=gestures.indexOf(event.gesture.direction);

            if(mapped!==-1){
               self.emit("move",mapped); 
            }
        });
    }

    restart(event){
       event.preventDefault();
       this.emit("restart");
    }
}


class HTMLActuator{
    constructor(){
        this.tileContainer=document.getElementsByClassName("tile-container")[0];
        this.scoreContainer=document.getElementsByClassName("score-container")[0];
        this.messageContainer=document.getElementsByClassName("game-message")[0];

        this.score=0;
    }

    actuate(grid,metadata){
        var self=this;

        window.requestAnimationFrame(()=>{
            self.clearContainer(self.tileContainer);

            grid.cells.forEach((column)=>{
                column.forEach((cell)=>{
                    if(cell){
                        self.addTile(cell);
                    }
                });
            });

            self.updateScore(metadata.score);
            if(metadata.over){
                self.message(false);
            }

            if(metadata.won){
                self.message(true);
            }
        });

    }

    restart(){
        this.clearMessage();
    }

    clearContainer(container){
        while(container.firstChild){
            container.removeChild(container.firstChild);
        }
    }

    addTile(tile){
        var self=this;

        var element=document.createElement("div");
        var position=tile.previousPosition||{x:tile.x,y:tile.y};
        var positionClass=this.positionClass(position);

        var classes=["tile","tile-"+tile.value,positionClass];
        this.applyClasses(element,classes);

        element.textContent=tile.value;

        if(tile.previousPosition){
            //事先已经存在的tile，没有被融合起来
            window.requestAnimationFrame(()=>{
                classes[2]=self.positionClass({x:tile.x,y:tile.y});
                self.applyClasses(element,classes);
            });
        }else if(tile.mergedFrom){
            //融合产生的新块
            classes.push("tile-merged");
            this.applyClasses(element,classes);
            

            tile.mergedFrom.forEach((merged)=>{
                self.addTile(merged);
            })

        }else{
            //随机产生的新块
            classes.push("tile-new");
            this.applyClasses(element,classes);
        }
        
        this.tileContainer.appendChild(element);
    }

    applyClasses(element,classes){
        element.setAttribute("class",classes.join(" "));
    }

    normalizePosition(position){
        return {x:position.x+1,y:position.y+1};
    }

    positionClass(position){
        position=this.normalizePosition(position);
        return "tile-position-"+position.x+"-"+position.y;
    }

    updateScore(score){
        this.clearContainer(this.scoreContainer);

        var difference=score-this.score;
        this.score=score;

        this.scoreContainer.textContent=this.score;

        if(difference>0){
            var addition=document.createElement("div");
            addition.classList.add("score-addition");
            addition.textContent="+"+difference;

            this.scoreContainer.appendChild(addition);
        }
    }

    message(won){
        var type=won?"game-won":"game-over";
        var message=won?"You win!":"Game over!";

        this.messageContainer.classList.add(type);
        this.messageContainer.getElementsByTagName("p")[0].textContent=message;
    }

    clearMessage(){
        this.messageContainer.classList.remove("game-won","game-over");
    }
}

class GameManager{
    constructor(size,InputManager,Actutator){
        this.size=size;
        this.inputManager=new InputManager;
        this.actuator=new Actutator;
        
        this.startTiles=2;

        this.inputManager.on("move",this.move.bind(this));
        this.inputManager.on("restart",this.restart.bind(this));

        this.setup();
    }

    restart(){
        this.actuator.restart();
        this.setup();
    }

    setup(){
        this.grid=new Grid(this.size);

        this.score=0;
        this.over=false;
        this.won=false;

        this.addStartTiles();
        this.actuate();
    }

    addStartTiles(){
        for(let i=0;i<this.startTiles;i++){
            this.addRandomTile();
        }
    }

    addRandomTile(){
        if(this.grid.cellsAvailable){
            var value=Math.random()<0.9?2:4;
            var tile=new Tile(this.grid.randomAvailableCell(),value);

            this.grid.insertTile(tile);
        }
    }

    actuate(){
        this.actuator.actuate(this.grid,{
            score:this.score,
            over:this.over,
            won:this.won
        });
    }

    prepareTiles(){
        this.grid.eachCell((x,y,tile)=>{
            if(tile){
                tile.mergedFrom=null;
                tile.savePosition();
            }
        })
    }

    moveTile(tile,cell){
        this.grid.cells[tile.x][tile.y]=null;
        this.grid.cells[cell.x][cell.y]=tile;

        tile.updatePostion(cell);
    }

    move(direction){
        var self=this;

        if(this.over||this.won){
            return;
        }

        var cell,tile;
        
        var vector=this.getVector(direction);
        var traversals=this.buildTraversals(vector);
        var moved=false;

        this.prepareTiles();

        traversals.x.forEach((x)=>{
            traversals.y.forEach((y)=>{
                cell={x:x,y:y};
                tile=self.grid.cellContent(cell);

                if(tile){
                    var positions=self.findFarthestPosition(cell,vector);
                    var next=self.grid.cellContent(positions.next);

                    if(next&&next.value===tile.value&&!next.mergedFrom){
                        var merged=new Tile(positions.next,tile.value*2);
                        merged.mergedFrom=[tile,next];

                        self.grid.insertTile(merged);
                        self.grid.removeTile(tile);

                        tile.updatePostion(positions.next);

                        self.score+=merged.value;

                        

                        if(merged.value===2048){
                            self.won=true;
                        }
                    }else{
                        self.moveTile(tile,positions.farthest);
                    }

                    if(!self.positionsEqual(cell,tile)){
                        moved=true;
                    }
                }

            });
        });

        if(moved){
            this.addRandomTile();

            if(!this.movesAvailable()){
                this.over=true;
            }

            this.actuate();
        }
    }

    getVector(direction){
        var map={
            0:{x:0,y:-1},
            1:{x:1,y:0},
            2:{x:0,y:1},
            3:{x:-1,y:0}
        }

        return map[direction];
    }

    buildTraversals(vector){
        var traversals={x:[],y:[]};

        for(let pos=0;pos<this.size;pos++){
            traversals.x.push(pos);
            traversals.y.push(pos);
        }

        if(vector.x===1){
            traversals.x=traversals.x.reverse();
        }

        if(vector.y===1){
            traversals.y=traversals.y.reverse();
        }

        return traversals;
    }

    findFarthestPosition(cell,vector){
        var previous;

        do{
            previous=cell;
            cell={x:previous.x+vector.x,y:previous.y+vector.y};
        }while(this.grid.withinBounds(cell)&&
               this.grid.cellAvailable(cell));
        
        return {
            farthest:previous,
            next:cell
        }
    }

    movesAvailable(){
        return this.grid.cellsAvailable()||this.tileMatchesAvailable();
    }

    tileMatchesAvailable(){
        var self=this;

        var tile;

        for(let x=0;x<this.size;x++){
            for(let y=0;y<this.size;y++){
                tile=this.grid.cellContent({x:x,y:y});

                if(tile){
                    for(let direction=0;direction<4;direction++){
                        let vector=self.getVector(direction);
                        let cell={x:x+vector.x,y:y+vector.y};
                        
                        var other=self.grid.cellContent(cell);

                        if(other&&other.value===tile.value){
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    positionsEqual(first,second){
        return first.x===second.x&&first.y===second.y;
    }
}

document.addEventListener("DOMContentLoaded",()=>{
    window.requestAnimationFrame(()=>{
        var manager=new GameManager(4,KeyboardInputManager,HTMLActuator);
    })
})