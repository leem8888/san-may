import { $, el, toast, uuid } from './dom.js';
import { SHOP_ITEMS } from '../shared/shop.js';

export class ShopPanel {
  constructor({ net, game, panels }) {
    Object.assign(this,{net,game,panels}); this.pending = new Map(); this.busy=false;
    $('#shopClaim').onclick=()=>this.perform('shop:claim');
  }
  async open(object) {
    if(this.busy)return;
    this.object=object; this.mode=object.action; this.state=null;
    $('#shopMessage').textContent=this.mode==='fishFeed'?'Mua thức ăn ở quầy bên phải đường vào Cổng Tam Quan. Mỗi lần dùng 1 túi; đàn cá tụ lại ăn rồi bơi đi.':'Quầy bên phải đường vào cổng. Mang lễ vào Chánh Điện hoặc mang thức ăn đến Hồ Sen.';
    $('#shopTitle').textContent=this.mode==='shop'?'Quầy hương & đồ dùng':this.mode==='fishFeed'?'Cho đàn cá ăn':'Dâng lễ tại Chánh Điện';
    $('#shopList').replaceChildren();$('#shopBalance').textContent='Đang xem túi lễ…';$('#shopClaim').hidden=true;
    this.panels.open('shopPanel');
    try {const res=await this.net.request('shop:open',{objectId:object.id});this.state=res.shop;this.render();}
    catch(error){$('#shopBalance').textContent=error.message;}
  }
  render(){
    if(!this.state)return;
    $('#shopBalance').textContent=`Bạn có ${this.state.points} điểm · Điểm trong game`;
    $('#shopClaim').hidden=this.mode!=='shop';$('#shopClaim').disabled=this.busy||!this.state.canClaim;
    $('#shopClaim').textContent=this.state.canClaim?'Nhận 30 điểm hôm nay':'Hôm nay đã nhận điểm';
    $('#shopList').replaceChildren(...Object.entries(SHOP_ITEMS).filter(([,item])=>this.mode==='shop'||(this.mode==='fishFeed'?item.feed:!item.feed)).map(([sku,item])=>{
      const quantity=this.state.inventory[sku]||0, buying=this.mode==='shop';
      return el('div',{class:'shop-item'},el('strong',{text:item.name}),el('p',{text:`${item.description} Đang mang: ${quantity}.`}),el('button',{
        type:'button',text:buying?`Mua · ${item.price} điểm`:item.feed?'Cho cá ăn · 1 túi':'Dâng lễ',disabled:this.busy||(buying?this.state.points<item.price||quantity>=20:quantity<1),
        onclick:()=>this.perform(buying?'shop:buy':item.feed?'fish:feed':'shop:offer',sku),
      }));
    }));
  }
  async perform(event,sku){
    if(this.busy||!this.object)return;
    const o=this.object;
    if(!this.game.scene.objects.includes(o)||Math.hypot(this.game.player.x-o.x,this.game.player.y-o.y)>o.radius)return toast('Hãy đến gần quầy hoặc bàn dâng lễ.');
    this.busy=true;this.render();
    const requestKey=event==='fish:feed'?'fish:feed':sku;
    if(['shop:buy','fish:feed'].includes(event)&&!this.pending.has(requestKey))this.pending.set(requestKey,uuid());
    try{
      const res=await this.net.request(event,{objectId:o.id,sku,requestId:this.pending.get(requestKey)});
      if(['shop:buy','fish:feed'].includes(event))this.pending.delete(requestKey);
      this.state=res.shop;
      if(event==='fish:feed'){
        this.game.scene.setFishFeed?.(res.feed,this.net.clock.now());this.game.player.act('interact');this.panels.close();toast('Bạn rải thức ăn. Đàn cá đang bơi lại gần!');
      }else if(event==='shop:offer'){this.game.player.act('pray');toast('Bạn nhẹ nhàng đặt lễ lên bàn. Chúc bạn an lành.');}
      else toast(event==='shop:claim'?'Đã nhận 30 điểm trong game.':`Đã mua ${SHOP_ITEMS[sku].name.toLowerCase()}. ${SHOP_ITEMS[sku].feed?'Mang đến Hồ Sen để cho cá ăn nhé.':'Mang vào Chánh Điện để dâng lễ nhé.'}`);
    }catch(error){toast(error.message);$('#shopMessage').textContent=error.message;}
    finally{this.busy=false;this.render();}
  }
}
