window.addEventListener("load", function () {

    const loader = document.getElementById("loader");

    if(loader){
        setTimeout(() => {
            loader.style.display = "none";
        }, 1800);
    }

});

const topBtn = document.getElementById("topBtn");

if(topBtn){

    window.addEventListener("scroll", function(){

        if(document.documentElement.scrollTop > 300){
            topBtn.style.display = "block";
        }else{
            topBtn.style.display = "none";
        }

    });

    topBtn.onclick = function(){

        window.scrollTo({
            top:0,
            behavior:"smooth"
        });

    };

}

const faders = document.querySelectorAll(".fade");

window.addEventListener("scroll",()=>{

    faders.forEach(item=>{

        const top = item.getBoundingClientRect().top;

        if(top < window.innerHeight - 100){
            item.classList.add("show");
        }

    });

});

const menuIcon = document.querySelector(".menu-icon");
const navLinks = document.querySelector(".nav-links");

if(menuIcon && navLinks){

    menuIcon.addEventListener("click",()=>{

        navLinks.classList.toggle("active");

        if(navLinks.classList.contains("active")){
            menuIcon.textContent = "✕";
        }else{
            menuIcon.textContent = "☰";
        }

    });

}