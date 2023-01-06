// Find all our documentation at https://docs.near.org
import { NearBindgen, near, call, view, initialize, LookupMap, UnorderedMap, assert } from 'near-sdk-js';
import { AccountId } from 'near-sdk-js/lib/types';
class Token{
  token_id:number;
  owner_id:AccountId;
  name: string;
  description: string;
  media_uri: string;
  level: number;
  constructor(token_id:number, owner_id:AccountId, name:string,description:string, media_uri:string, level:number){
      this.token_id = token_id;
      this.owner_id = owner_id;
      this.name = name;
      this.description = description;
      this.media_uri = media_uri;
      this.level = level;
  }
}
@NearBindgen({})
class Contract {
  token_id:number;
  owner_id:AccountId;
  owner_by_id:LookupMap<string>;
  token_by_id:LookupMap<Token>
  constructor(){
    this.token_id = 0;
    this.owner_id = "";
    this.owner_by_id = new LookupMap("o");
    this.token_by_id = new LookupMap("t")
  }

  @initialize({})
  init({owner_id, prefix}:{owner_id: AccountId, prefix:string}){
    this.owner_id = owner_id;
    this.token_id = 0;
    this.owner_by_id = new LookupMap(prefix);
    this.token_by_id = new LookupMap("t")
  }

  @call({})
  mint_nft({token_owner_id, name, description, media_uri, level }){
    this.owner_by_id.set(this.token_id.toString(), token_owner_id);
    let token = new Token(this.token_id, token_owner_id, name,description, media_uri, level);
    this.token_by_id.set(this.token_id.toString(), token);
    this.token_id ++;
    return token;
  }

  @view({})
  get_token_by_id({token_id}:{token_id:number}){
    let token = this.token_by_id.get(token_id.toString())
    return token

  }

  @view({})
  get_supply_tokens(){
    return this.token_id;
  }

  @view({})
  get_all_token(){
    var all_tokens = [];
    for(var i = 0; i< this.token_id; i++){
      all_tokens.push(this.token_by_id.get(i.toString()));
    }
    return all_tokens;
  }

  internal_transfer({from, to, token_id, approval_id, memo}:{from:AccountId, to: AccountId, token_id: number,approval_id: number|null, memo: string|null}){
    let token = this.token_by_id.get(token_id.toString());
    // Check that the token exists
    assert(token !== null, "Token not found");
    
    // Check that the sender is the owner of the token
    let owner = this.owner_by_id.get(token_id.toString());
    assert(owner === from, "Sender must be the current owner");
    
    assert(owner !== to, "current and next owner must be different");
    // Transfer the token to the new owner
    this.owner_by_id.set(token_id.toString(), to);

    return owner;
  }

  @call({})
  nft_transfer({to, token_id, approval_id, memo}:{to: AccountId, token_id: number,approval_id: number|null, memo: string|null}): void {
    let from = near.predecessorAccountId();
    // Get the token that is being transferred
    this.internal_transfer({from, to, token_id, approval_id, memo});
  }

  @call({})
  nft_transfer_call({to, token_id, msg,  approval_id, memo}: {to:AccountId, token_id: number,msg:string, approval_id: number|null, memo: string|null}){
    near.log(
      `nft_transfer_call called, receiver_id ${to}, token_id ${token_id}`
    );
    
    let from = near.predecessorAccountId();
    let old_owner = this.internal_transfer({from, to, token_id, approval_id, memo});
    const promise = near.promiseBatchCreate(to)
    near.promiseBatchActionFunctionCall(
      promise,
      "nft_on_transfer",
      JSON.stringify({
        sender_id:from,
        previous_owner_id:old_owner,
        token_id:token_id,
        msg
      }),
      0,
      30000000000000
    );
    near.promiseThen(
      promise,
      near.currentAccountId(),
      "nft_resolve_transfer",
      JSON.stringify({
        previous_owner_id: old_owner, 
        to, 
        token_id}),
      0,
      30000000000000
    )
  }
  @call({})
  nft_resolve_transfer({previous_owner_id, receiver_id, token_id, approved_account_ids}:{ previous_owner_id: string, receiver_id: string, token_id: number, approved_account_ids: null|Record<string, number>}){
    near.log(
      `nft_resolve_transfer called, receiver_id ${receiver_id}, token_id ${token_id}`

    );
    const is_token_transfered = JSON.parse(near.promiseResult(0));
    near.log(`NFT with id: ${token_id} ${is_token_transfered ? "was transfered":"was not transfered"}`)

    if(!is_token_transfered){
      near.log(`Returning ${token_id} to ${receiver_id}`);
      const current_owner = this.owner_by_id.get(token_id.toString());
      if(current_owner === receiver_id){
        this.internal_transfer({
          from:receiver_id,
          to:previous_owner_id,
          token_id,
          approval_id:null,
          memo:null
        })
        near.log(`${token_id} returned to ${previous_owner_id}`);
        return;
      }
      near.log(
        `Failed to return token ${token_id}. It was burned or not owned by ${receiver_id} now.`
      );

    }
  }
}