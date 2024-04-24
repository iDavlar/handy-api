// import * as Handy from '@ohdoki/handy-sdk';

// import * as Handy from "../../../dist/handy.esm.js";

// const script = document.createElement('script');
// script.setAttribute("type", "module");
// script.setAttribute("src", chrome.runtime.getURL('dist/handy.umd.js'));
// const head = document.head || document.getElementsByTagName("head")[0] || document.documentElement;
// head.insertBefore(script, head.lastChild);

/*(async () => {
    const src = chrome.runtime.getURL("dist/handy.umd.js");
    const Handy = await import(src);

    console.log("I am here");
    const video = document.querySelector('video');
    const handy = Handy.init();

    handy.attachUUI('content');
    handy.setVideoPlayer(video);

    handy.on('connect', () => {
        handy
            .setScript(
                'https://playground.handyfeeling.com/assets/sync_video_2021.csv',
            )
            .then(console.log);
    });

    handy.on('disconnect', () => video.pause());

})();*/

window.addEventListener("load", function() {
    console.log("I am here");

    // var iframe = document.querySelector('iframe');
    // var iframeDocument = iframe.contentDocument || iframe.contentWindow.document;

    const player = new playerjs.Player('iframe');

    player.on('ready', () => {
        player.on('play', () => {
            console.log('play');
        });

        player.getDuration(duration => console.log(duration));

        if (player.supports('method', 'mute')) {
            player.mute();
        }

        player.play();
    });


    const video = document.querySelector('video');
    const handy = Handy.init();

    handy.attachUUI('content');
    handy.setVideoPlayer(player);

    handy.on('connect', () => {
        handy
            .setScript(
                'https://playground.handyfeeling.com/assets/sync_video_2021.csv',
            )
            .then(console.log);
    });

    handy.on('disconnect', () => video.pause());
}, true);

/*console.log("I am here");
const video = document.querySelector('video');
console.log(video.title);
const handy = Handy.init();

handy.attachUUI('content');
handy.setVideoPlayer(video);

handy.on('connect', () => {
    handy
        .setScript(
            'https://playground.handyfeeling.com/assets/sync_video_2021.csv',
        )
        .then(console.log);
});

handy.on('disconnect', () => video.pause());*/


// import * as Handy from "dist/handy.esm.js";
//
// console.log("I am here");
// const video = document.querySelector('video');
// const handy = Handy.init();
//
// handy.attachUUI('content');
// handy.setVideoPlayer(video);
//
// handy.on('connect', () => {
//     handy
//         .setScript(
//             'https://playground.handyfeeling.com/assets/sync_video_2021.csv',
//         )
//         .then(console.log);
// });
//
// handy.on('disconnect', () => video.pause());