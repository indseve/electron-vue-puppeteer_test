<template>
    <div>
        <mt-field label="用户名" placeholder="请输入用户名" v-model="username"></mt-field>
        <mt-field label="密码" placeholder="请输入密码" type="password" v-model="password"></mt-field>
        <mt-button type="primary" id="submit" v-on:click="submit">primary</mt-button>
        <div>
            <img :src="img.src" alt="">
            <p>{{img.stateTip}}</p>
        </div>
        <div>
            <ul>
                <li v-for="(shop, index) in shopList" :key="index">
                    {{index}}. {{shop.name}}
                    <div>
                        <li v-for="(item, index) in shop.items" :key="index">
                                {{index}}. {{item.name}}
                                <div>
                                    <img :src="item.img" alt="">
                                </div>
                        </li>                        
                    </div>
                </li>
            </ul>
        </div>
    </div>
</template>

<script>
import * as pup from '../assets/puppeteer.js'
export default {
    name: 'login',
    data() {
        return {
            username:'tf通天晓',
            password:'lff3325331',
            img:{
                src:'',
                stateTip:''
            },
            shopList:[]
        }
    },
    methods: {
        submit: async function () {
            await pup.init()
            let flag = await pup.login(this.username,this.img,this.$data)
            // if(flag)
            //     alert("success")
            // else{
            //     alert(flag);
            //     img.src=null;
            //     img.stateTip='请重试'
            // }
        }
    },
}
</script>
