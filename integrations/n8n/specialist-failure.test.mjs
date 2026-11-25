import test from 'node:test';import assert from 'node:assert/strict';
import {specialistFailureExpression} from './specialist-failure.mjs';
const classify=new Function('$json','return '+specialistFailureExpression.slice(3,-2));
test('budget exhaustion is distinct from outages, parsing and contract rejection',()=>{
 for(const input of [{output:'Agent stopped due to max iterations.'},{error:{message:'Maximum iterations reached'}}])assert.equal(JSON.parse(classify(input)).errorCode,'ITERATION_LIMIT');
 assert.equal(JSON.parse(classify({error:'RESOURCE_EXHAUSTED quota 429'})).errorCode,'PROVIDER_QUOTA');
 assert.equal(JSON.parse(classify({error:'The service is receiving too many requests from you'})).errorCode,'PROVIDER_QUOTA');
 assert.equal(JSON.parse(classify({error:{message:'Too Many Requests',httpCode:'429'}})).errorCode,'PROVIDER_QUOTA');
 assert.equal(JSON.parse(classify({error:'OutputParser schema error'})).errorCode,'PARSER_ERROR');
 assert.equal(JSON.parse(classify({error:'Bad request 400'})).errorCode,'CONTRACT_ERROR');
 assert.equal(JSON.parse(classify({error:'Google API unavailable'})).errorCode,'PROVIDER_UNAVAILABLE');
});
