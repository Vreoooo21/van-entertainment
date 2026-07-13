window.addEventListener("load", function () {

    setTimeout(() => {

        document.getElementById("loader").style.display = "none";

    }, 1800);

});

const topBtn = document.getElementById("topBtn");

window.onscroll = function(){

    if(document.documentElement.scrollTop > 300){

        topBtn.style.display = "block";

    }else{

        topBtn.style.display = "none";

    }

}

topBtn.onclick = function(){

    window.scrollTo({

        top:0,

        behavior:"smooth"

    });

}

const faders = document.querySelectorAll(".fade");

window.addEventListener("scroll",()=>{

    faders.forEach(item=>{

        const top=item.getBoundingClientRect().top;

        if(top<window.innerHeight-100){

            item.classList.add("show");

        }

    })

})