import { describe, expect, it } from 'vitest'
import type { WardrobeItem } from '../../../types/wardrobe'
import { normalizeLookLayout, reconcileLookLayout } from './wardrobeLookLayout'

const item=(id:string,category:WardrobeItem['category']):WardrobeItem=>({id,category,workspaceId:'w',ownerId:'u',name:id,color:'#112233',seasons:[],brand:'',size:'',note:'',imagePath:'',status:'available',visibility:'private',favorite:false,createdAt:'',updatedAt:''})

describe('wardrobe look layout',()=>{
  it('places clothing by category and preserves saved coordinates',()=>{
    const items=[item('shirt','top'),item('jeans','bottom'),item('shoes','shoes')]
    const layout=reconcileLookLayout(items,[{itemId:'shirt',x:22,y:31,width:48,rotation:0,zIndex:5}])
    expect(layout).toHaveLength(3)
    expect(layout[0]).toMatchObject({itemId:'shirt',x:22,y:31,zIndex:5})
    expect(layout[1].y).toBeGreaterThan(layout[0].y)
    expect(layout[2].y).toBeGreaterThan(layout[1].y)
  })

  it('clamps invalid coordinates',()=>{
    expect(normalizeLookLayout([{itemId:'shirt',x:-100,y:400,width:1000,rotation:99,zIndex:0},null])).toEqual([{itemId:'shirt',x:5,y:95,width:90,rotation:25,zIndex:1}])
  })

  it('drops placements for clothes removed from the look',()=>{
    const layout=reconcileLookLayout([item('shirt','top')],[{itemId:'old',x:50,y:50,width:50,rotation:0,zIndex:1}])
    expect(layout.map(entry=>entry.itemId)).toEqual(['shirt'])
  })
})
