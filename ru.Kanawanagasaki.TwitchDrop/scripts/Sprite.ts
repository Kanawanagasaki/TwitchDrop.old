class Sprite
{
    public Uri:string;
    public OnLoad:()=>any;
    public OnError:()=>any;

    private _width:number;
    private _height:number;
    public get Size() { return new Vector(this._width, this._height); }

    private _isAnimation:boolean;
    private _framesCount:number;
    private _animationTime:number;

    private _image:HTMLImageElement;

    private _rowsCount:number;
    private _columnsCount:number;

    public constructor(uri:string)
    {
        let img = new Image();
        img.onload = ()=>
        {
            this._width = img.width;
            this._height = img.height;
            this._image = img;
            if(this.OnLoad)
                this.OnLoad();
        };
        img.onerror = ()=>
        {
            if(this.OnError)
                this.OnError();
        }
        img.src = uri;

        this.Uri = uri;
        this._isAnimation = false;
    }

    public GetName()
    {
        let ret = this.Uri;

        let dotIndex = this.Uri.lastIndexOf(".");
        if(dotIndex >= 0) ret = ret.substr(0, dotIndex);

        let slashIndex = ret.lastIndexOf("/");
        if(slashIndex >= 0) ret = ret.substr(slashIndex + 1);

        return ret;
    }
    
    public Animate(width:number, height:number, fps:number, framesCount:number = null)
    {
        this._isAnimation = true;

        this._columnsCount = Math.floor(this._width / width);
        this._rowsCount = Math.floor(this._height / height);

        if(framesCount === undefined || framesCount === null)
            this._framesCount = this._columnsCount * this._rowsCount;
        else
            this._framesCount = framesCount;

        this._animationTime = 1000 / fps * this._framesCount;

        this._width = width;
        this._height = height;
    }

    public Draw(ctx:CanvasRenderingContext2D, x:number, y:number, width:number, height:number, time:number = 0)
    {
        let b = this.GetFrameBoundary(time);
        ctx.drawImage(this._image, b.x, b.y, b.w, b.h, x, y, width, height);
    }

    public DrawDistored(ctx:CanvasRenderingContext2D, x:number, y:number, width:number, height:number, distortion:(dx, dy)=>{x:number, y:number}, time:number = 0)
    {
        let quality = 2 + renderQuality;
        let map:{x:number, y:number}[][] = [];
        for(let iy = 0; iy < quality; iy++)
        {
            map[iy] = [];
            for(let ix = 0; ix < quality; ix++)
            {
                let dx = ix / (quality - 1);
                let dy = iy / (quality - 1);

                map[iy][ix] = distortion(dx, dy);
            }
        }

        let b = this.GetFrameBoundary(time);
        let sourceTileWidth = b.w / (quality - 1);
        let sourceTileHeight = b.h / (quality - 1);
        let destinationTileWidth = width / (quality - 1);
        let destinationTileHeight = height / (quality - 1);
        for(let iy = 0; iy < map.length - 1; iy++)
        {
            for(let ix = 0; ix < map[iy].length - 1; ix++)
            {
                let tx1 = b.x + ix * sourceTileWidth;
                let ty1 = b.y + iy * sourceTileHeight;
                let tx2 = tx1 + sourceTileWidth;
                let ty2 = ty1 + sourceTileHeight;

                let px1 = x + ix * destinationTileWidth + map[iy][ix].x - 0.2;
                let py1 = y + iy * destinationTileHeight + map[iy][ix].y - 0.2;
                let px2 = x + ix * destinationTileWidth + destinationTileWidth + map[iy][ix+1].x + 0.2;
                let py2 = y + iy * destinationTileHeight + map[iy][ix+1].y - 0.2;
                let px3 = x + ix * destinationTileWidth + map[iy+1][ix].x - 0.2;
                let py3 = y + iy * destinationTileHeight + destinationTileHeight + map[iy+1][ix].y + 0.2;
                let px4 = x + ix * destinationTileWidth + destinationTileWidth + map[iy+1][ix+1].x + 0.2;
                let py4 = y + iy * destinationTileHeight + destinationTileHeight + map[iy+1][ix+1].y + 0.2;

                this.DrawTriangle(ctx, tx1, ty1, tx2, ty1, tx1, ty2, px1, py1, px2, py2, px3, py3);
                this.DrawTriangle(ctx, tx2, ty1, tx2, ty2, tx1, ty2, px2, py2, px4, py4, px3, py3);
            }
        }
    }

    // DrawTriangle uses `Affine Transformation`
    public DrawTriangle(ctx:CanvasRenderingContext2D,
                        sx1:number, sy1:number, sx2:number, sy2:number, sx3:number, sy3:number,
                        dx1:number, dy1:number, dx2:number, dy2:number, dx3:number, dy3:number)
    {
        // matrix A^-1
        let mA:number[][] = [[],[],[]];
        mA[0][0] = (sy2 - sy3) / (sx3*sy1 - sx2*sy1 + sx1*sy2 + sx2*sy3 - sx1*sy3 - sx3*sy2);
        mA[0][1] = (-sx2 + sx3) / (-sx2*sy1 + sx3*sy1 - sx3*sy2 + sx1*sy2 - sx1*sy3 + sx2*sy3);
        mA[0][2] = (-sx3*sy2 + sx2*sy3) / (sx3*sy1 - sx2*sy1 + sx1*sy2 + sx2*sy3 - sx1*sy3 - sx3*sy2);
        mA[1][0] = - (sy1 - sy3) / (sx3*sy1 - sx2*sy1 + sx1*sy2 + sx2*sy3 - sx1*sy3 - sx3*sy2);
        mA[1][1] = (sx1 - sx3) / (sx3*sy1 - sx2*sy1 + sx1*sy2 + sx2*sy3 - sx1*sy3 - sx3*sy2);
        mA[1][2] = (sx3*sy1 - sx1*sy3) / (-sx2*sy1 + sx3*sy1 - sx3*sy2 + sx1*sy2 - sx1*sy3 + sx2*sy3);
        mA[2][0] = (sy1 - sy2) / (-sx2*sy1 + sx3*sy1 - sx3*sy2 + sx1*sy2 - sx1*sy3 + sx2*sy3);
        mA[2][1] = (-sx1 + sx2) / (-sx2*sy1 + sx3*sy1 - sx3*sy2 + sx1*sy2 - sx1*sy3 + sx2*sy3);
        mA[2][2] = - (sx2*sy1 - sx1*sy2) / (-sx2*sy1 + sx3*sy1 - sx3*sy2 + sx1*sy2 - sx1*sy3 + sx2*sy3);

        // matrix X... was here, but it not nesesery to declare it ¯\_(ツ)_/¯
        
        // matrix T=X*A^-1 ... it should be 3x3, but we interested in only on 2x3
        let mT = [[],[]];
        mT[0][0] = dx1*mA[0][0] + dx2*mA[1][0] + dx3*mA[2][0];
        mT[0][1] = dx1*mA[0][1] + dx2*mA[1][1] + dx3*mA[2][1];
        mT[0][2] = dx1*mA[0][2] + dx2*mA[1][2] + dx3*mA[2][2];
        mT[1][0] = dy1*mA[0][0] + dy2*mA[1][0] + dy3*mA[2][0];
        mT[1][1] = dy1*mA[0][1] + dy2*mA[1][1] + dy3*mA[2][1];
        mT[1][2] = dy1*mA[0][2] + dy2*mA[1][2] + dy3*mA[2][2];

        let xAvr = (sx1+sx2+sx3)/3;
        let yAvr = (sy1+sy2+sy3)/3;
        
        ctx.save();
        ctx.transform(mT[0][0], mT[1][0], mT[0][1], mT[1][1], mT[0][2], mT[1][2]);
        ctx.beginPath();

        ctx.moveTo(sx1, sy1 + Math.sign(sy1-yAvr));
        ctx.lineTo(sx1 + Math.sign(sx1-xAvr), sy1);

        ctx.lineTo(sx2, sy2 + Math.sign(sy2-yAvr));
        ctx.lineTo(sx2 + Math.sign(sx2-xAvr), sy2);

        ctx.lineTo(sx3, sy3 + Math.sign(sy3-yAvr));
        ctx.lineTo(sx3 + Math.sign(sx3-xAvr), sy3);

        ctx.clip();
        ctx.drawImage(this._image, 0, 0);
        ctx.restore();
    }

    private GetFrameBoundary(time:number)
    {
        if(this._isAnimation)
        {
            time %= this._animationTime;
            let frame = Math.floor(time / this._animationTime * this._framesCount);
            
            let column = frame % this._columnsCount;
            let row = Math.floor(frame / this._columnsCount);
    
            return {x:column*this._width+0.5,y:row *this._height+0.5,w:this._width-1,h:this._height-1};
        }
        else return {x:0, y:0, w:this._width, h:this._height};
    }
}