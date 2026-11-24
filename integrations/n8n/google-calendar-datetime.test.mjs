import test from 'node:test';
import assert from 'node:assert/strict';
import {GoogleProvider} from './google-provider.mjs';
test('Google availability receives RFC3339 seconds for Java OffsetDateTime without seconds',async()=>{
 const g=new GoogleProvider({calendarId:'support'});let body;
 g.request=async(kind,path,method,input)=>{body=input;return {calendars:{support:{busy:[]}}};};
 const result=await g.availability('2026-11-20T09:00-05:00','2026-11-20T17:00-05:00');
 assert.equal(body.timeMin,'2026-11-20T14:00:00.000Z');
 assert.equal(body.timeMax,'2026-11-20T22:00:00.000Z');assert.equal(result.available,true);
});
test('event creation normalizes timestamps without changing their instants',async()=>{
 const g=new GoogleProvider({calendarId:'support'});let body;
 g.availability=async()=>({available:true});
 g.request=async(kind,path,method,input)=>{if(method==='POST'){body=input;return {id:'synthetic'};}return null;};
 await g.event('create',{eventId:'synthetic',start:'2026-11-20T09:00-05:00',end:'2026-11-20T09:30-05:00',email:'demo@example.invalid'});
 assert.equal(body.start.dateTime,'2026-11-20T14:00:00.000Z');assert.equal(body.end.dateTime,'2026-11-20T14:30:00.000Z');
});
