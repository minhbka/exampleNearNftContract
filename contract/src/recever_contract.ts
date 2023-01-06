import { NearBindgen, call, near, assert, initialize } from "near-sdk-js";
import { AccountId } from 'near-sdk-js/lib/types';
@NearBindgen({})
class ReceiverContract {
    account_id:AccountId;
    constructor(){
        this.account_id = "";
    }

    @initialize({})
    init({account_id}:{account_id:AccountId}){
        this.account_id = account_id;
    }

    @call({})
    nft_on_transfer({sender_id, previous_owner_id, token_id, msg}:{sender_id: string,previous_owner_id: string, token_id: string,msg: string}){
        near.log(
            `nft_on_transfer called, params: sender_id: ${sender_id}, previous_owner_id: ${previous_owner_id}, token_id: ${token_id}, msg: ${msg}`
        );
        assert(near.predecessorAccountId() === this.account_id, "Only supports the one non-fungible token contract")
        
        if (msg === "return-it-now") {
            near.log(`Returning ${token_id} to ${sender_id}`);
            return false;
        } else if (msg === "keep-it-now") {
            near.log(`Keep ${token_id}`);
            return true;
        } else {
            throw Error("unsupported msg");
        }
    }
}