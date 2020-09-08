var box_size;
var pen_sizes = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
var pen_size;

var default_option = {
    show_romaji: false,
    show_kana: false,
    show_kanji: false,
    show_grid: 1,
    box_size: 600,
    pen_size: 2,
    mode: 1,
    // 0 : all randomly
    // 1 : phrase/word exercises
    // 2 : kana practice
    compound_kana: true
};

const exe_file_name = "./JA_exercises.txt"
const pen_base_size = 40;
const snapshot_w = 80;
const snapshot_h = 80;
const max_snapshot_row = 10;
const timer_interval = 8;
var mode;
var use_compound_kana;

var all_kana;

var log = [];
var currentExercise = null;
var currentGrid = 0;


$(document).ready(function () {
    let canvas = document.getElementById("draw-canvas");

    let strokes;
    let startTime, timer_enabled;
    function startTimer() {
        startTime = new Date().getTime();
        timer_enabled = true;
    }
    function updateTimer() {
        if (timer_enabled) {
            $timer.text(parseTime(new Date().getTime() - startTime));
        }
    }

    setInterval(updateTimer, timer_interval)

    startTimer();





    let $show_options = $("#show_options");
    $show_options.height($("#options").height() + 18);

    getExercisesFromSource(loadExercise);
    //runs when page loaded.
    let $drawbox = $("#draw-box");
    let $canvas = $("#draw-canvas");
    let $log = $("#draw-log");
    let $timer = $("#timer");
    let $accept = $("#accept")
    let $finish = $("#finish_dialog");
    let $finish_log = $("#finish_log");
    let $finish_shadow = $("#shadow");
    $console = $("#console");

    function resetCanvas() {
        box_size = $("#box_size").val();
        $("#box_size_display").text(box_size + "px");
        canvas.width = box_size;
        canvas.height = box_size;
        $drawbox.width(box_size);
        $drawbox.height(box_size);
        $("#drawbox").width(box_size);
        $("#drawbox").height(box_size);
        if (currentGrid == 1) {
            $drawbox.css("background-image", "url('./img/kana-grid1.svg')").css("background-size", `${box_size}px ${box_size}px`);
        }
        else if (currentGrid == 2) {
            $drawbox.css("background-image", "url('./img/kana-grid2.svg')").css("background-size", `${box_size}px ${box_size}px`);
        }
        $log.css("top", -box_size - 22);
        $timer.css("top", -box_size - 22);
        resetPen();
    }
    resetCanvas();
    function resetConsole() {
        $console.css("left", ($("#draw-wrapper").width() - $console.width()) / 2)
    }
    resetConsole();

    function resetPen() {
        pen_modifier = pen_base_size / pen_sizes[$("#pen_size").val()];
        pen_size = Math.floor(box_size / (pen_modifier));
        $("#pen_size_display").text((Math.floor(100 * (pen_base_size / pen_modifier)) / 100) + "x");
        clearCanvas();
    }
    resetPen();
    $(window).resize(resetConsole);
    var isdrawing = false;

    $canvas.on("mousedown", function (e) {
        e.preventDefault();

        if (e.button == 0) {
            isdrawing = true;
            strokes++;
            $(this).drawEllipse({
                fillStyle: '#000',
                x: last_mouse.x, y: last_mouse.y,
                width: pen_size, height: pen_size,
                rounded: true,
            });
        }
        else if (e.button == 2) {
            //right click
            if (currentExercise.type == 'word') logSnapshot();
            else logAndAccept();
            clearCanvas();
            isdrawing = false;
        }

    });
    $canvas.on("mouseup", function (e) {
        if (e.button == 0) {
            isdrawing = false;
        }
    });
    let last_mouse = null;
    $canvas.on("mousemove", function (e) {
        let mouse = {
            x: e.offsetX,
            y: e.offsetY
        };
        if (!last_mouse) last_mouse = mouse;
        if (isdrawing) {
            $(this).drawLine({
                strokeStyle: '#000',
                strokeWidth: pen_size,
                rounded: true,
                x1: last_mouse.x, y1: last_mouse.y,
                x2: mouse.x, y2: mouse.y,
            });
        }
        last_mouse = mouse;
    });
    $canvas.on("mouseleave", function () {
        isdrawing = false;
    });

    $(".checkbox").click(function () {
        $(this).toggleClass("checked");
        updateOption($(this).attr('id'), $(this).hasClass("checked"));
    })
    $(".tricheckbox").click(function () {
        let checkstate = null;
        if ($(this).hasClass("checked1")) {
            $(this).removeClass("checked1").addClass("checked2");
            checkstate = 2;
        }
        else if ($(this).hasClass("checked2")) {
            $(this).removeClass("checked2"); checkstate = 0;
        }
        else {
            $(this).addClass("checked1")
            checkstate = 1;
        }
        updateOption($(this).attr("id"), checkstate)
    });

    $("#delete").click(clearCanvas)
    $("#undo").click(undo)
    $accept.click(accept);

    $("#retry").click(function () {
        $finish.hide();
        $finish_shadow.hide();
        clearLog();
        clearCanvas();
        startTimer();
    });

    $("#next").click(function () {
        $finish.hide();
        $finish_shadow.hide();
        clearLog();
        loadExercise();
    });

    $finish.hide();
    $finish_shadow.hide();

    // kanji support.
    // kana number?
    // stroke number!

    $show_options.click(function () {
        showOptions(!options_out)
    })

    $("#finish_answer").click(function () {
        if ($(this).html() === currentExercise.kana && currentExercise.kanji) $(this).html("<span class='kanji'>" + currentExercise.kanji + "</span>")
        else $(this).html(constructResultKanaHTML(currentExercise.kana));
    });

    var options_out = true;
    function showOptions(out) {
        if (out) {
            $("#options").css("left", "0");
            $show_options.find('img').css("transform", "rotate(180deg)")
        }
        else {
            $("#options").css("left", (-$("#options").width() + 18) + "px");
            $show_options.find('img').css("transform", "rotate(0deg)")
        }
        options_out = out;
    }

    function showRomaji(out) {
        if (out) {
            $("#instruction_romaji").css("right", $("#instruction_romaji").width() + 15);

        }
        else {
            $("#instruction_romaji").css("right", 0);
        }
    }

    function showKana(out) {
        if (out) {
            $("#instruction_kana").css("right", $("#instruction_kana").width() + 15);

        }
        else {
            $("#instruction_kana").css("right", 0);
        }
    }

    function showKanji(out) {
        if (out) {
            $("#instruction_kanji").css("right", $("#instruction_kanji").width() + 15);

        }
        else {
            $("#instruction_kanji").css("right", 0);
        }
    }

    showOptions(true);

    showRomaji(false);
    showKana(false);
    showKanji(false);

    $("#box_size_display").text(box_size + "px");
    $("#box_size").on("input", function (e) {
        box_size = $(this).val();
        resetCanvas();
    });
    $("#pen_size").on("input", resetPen);

    $("#mode").on("input", function (e) {
        setMode(parseInt($(this).val()));
    });


    function setMode(new_mode) {
        mode = new_mode;
        loadExercise();
    }
    function updateOption(option, value) {
        switch (option) {
            case "show_romaji":
                showRomaji(value);
                break;
            case "show_kana":
                showKana(value)
                break;
            case "show_kanji":
                showKanji(value)
                break;
            case "show_grid":
                currentGrid = value;
                if (value == 0) {
                    $drawbox.css("background-image", "none");
                }
                else if (value == 1) {
                    $drawbox.css("background-image", "url('./img/kana-grid1.svg')").css("background-size", `${box_size}px ${box_size}px`);
                }
                else if (value == 2) {
                    $drawbox.css("background-image", "url('./img/kana-grid2.svg')").css("background-size", `${box_size}px ${box_size}px`);
                }
                break;

            case "compound_kana":
                use_compound_kana = value;
                break;
            default: console.log("fail"); return;
        }
    }

    function resetOptions() {
        $(".checkbox").removeClass("checked")
        //$("#instruction_romaji").css("visibility", "hidden");
        //$("#instruction_kana").css("visibility", "hidden");
        //$("#instruction_kanji").css("visibility", "hidden");

        $(".tricheckbox").removeClass("checked1").removeClass("checked2");
        $drawbox.css("background-image", "none");


        if (default_option.show_romaji) $("#show_romaji").addClass("checked");
        updateOption("show_romaji", default_option.show_romaji);
        if (default_option.show_kana) $("#show_kana").addClass("checked");
        updateOption("show_kana", default_option.show_kana);
        if (default_option.show_kanji) $("#show_kana").addClass("checked");
        updateOption("show_kanji", default_option.show_kanji);
        if (default_option.show_grid == 1) $("#show_grid").addClass("checked1");
        else if (default_option.show_grid == 2) $("#show_grid").addClass("checked2");
        updateOption("show_grid", default_option.show_grid);

        $("#box_size").val(default_option.box_size);

        $("#pen_size").val(default_option.pen_size);
        resetCanvas();

        $("#mode").val(default_option.mode);
        mode = default_option.mode;

        if (default_option.compound_kana) $("#compound_kana").addClass("checked");
        updateOption("compound_kana", default_option.compound_kana);

    }

    resetOptions();

    function clearLog() {
        log = [];
        $log.children().remove();
        $log.height(0);
        $log.css("opacity", "0");
        $accept.css("opacity", "0");
        $accept.prop("disabled", true);
    }
    function logSnapshot() {
        //saves the current canvas as png and stores in log.
        let canvas = document.getElementById("draw-canvas");

        let snapshot = canvas.toDataURL("image/png");
        log.push({ snapshot, strokes });
        $log.css("opacity", "1")
        $accept.css("opacity", "1").prop("disabled", false)
        $log.append(`<img class="log_img" src="${snapshot}" width="${snapshot_w}" height="${snapshot_h}">`)
        if ($log.height() < snapshot_h * max_snapshot_row) {
            $log.height(log.length * snapshot_h)
        }
    }

    function logAndAccept() {
        //saves the current canvas as png and stores in log.
        let canvas = document.getElementById("draw-canvas");
        let snapshot = canvas.toDataURL("image/png");
        $log.append(`<img class="log_img" src="${snapshot}" width="${snapshot_w}" height="${snapshot_h}">`)
        log.push({ snapshot, strokes });
        accept();
    }



    function undo() {
        if (log.length > 0) {

            log.pop();
            $("#draw-log img").last().remove();
            if (log.length == 0) {
                $log.css("opacity", "0")
                $accept.css("opacity", "0").prop("disabled", true);

            }
            $log.height(log.length * snapshot_h)

        }
    }

    function constructResultKanaHTML(kana_series) {
        //constructs an html sequence of <span class="answer_kana [correct/incorrect]">
        let html = "";

        for (let k in kana_series) {
            let kana = kana_series[k];
            html += kana;
        }

        return html;
    }

    function accept() {
        $finish_log.html($log.html());
        document.getElementById("finish_answer").innerHTML = constructResultKanaHTML(currentExercise.kana);
        document.getElementById("finish_answer_romaji").innerHTML = currentExercise.romaji;

        $finish.css("left", (($("body").width() - $finish.width()) / 2) + "px")
        $finish.show();
        $finish_shadow.show();


        let stopTime = new Date().getTime();
        timer_enabled = false;

        $("#timer").text(parseTime(stopTime - startTime));
        $("td.stats_time").text(parseTimeLong(stopTime - startTime));


        let chars = log.length;
        let chars_correct;
        if (use_compound_kana && currentExercise.type == "word" && currentExercise.compounds)
            chars_correct = currentExercise.compounds.length;
        else
            chars_correct = currentExercise.kana.length;

        $("td.stats_characters").text(chars + "/" + chars_correct);
        if (chars == chars_correct)
            $(".stats_characters").removeClass("incorrect").addClass("correct");
        else
            $(".stats_characters").removeClass("correct").addClass("incorrect");

        //strokes
        let totalStrokes = 0;
        for (let c in log) totalStrokes += log[c].strokes;

        let strokes_correct = 0;
        if (currentExercise.strokes) {
            strokes_correct = currentExercise.strokes;
        }
        else {
            for (let k of currentExercise.kana) {
                let kana_obj = findKanaObject(k);
                strokes_correct += kana_obj.strokes;
            }
        }

        $("td.stats_strokes").text(totalStrokes + "/" + strokes_correct);
        if (totalStrokes === strokes_correct)
            $(".stats_strokes").removeClass("incorrect").addClass("correct");
        else
            $(".stats_strokes").removeClass("correct").addClass("incorrect");



    }

    function getKanaPractice(p) {
        let k = all_kana[p];
        let a = Math.floor(Math.random() * 2) + 1;
        let letters = a == 1 ? 'hiragana' : 'katakana'
        return { type: 'kana', english: k.romaji, sub: letters, kana: k[letters].char, kanji: null, romaji: k.romaji };

    }

    function randomExercise() {
        switch (mode) {
            case 0:
                let r = Math.floor(Math.random() * (exercises.length + all_kana.normal.length));
                if (r < exercises.length) {
                    return exercises[r];
                } else {
                    return getKanaPractice(r - exercises.length);
                }

            case 1: return exercises[Math.floor(Math.random() * exercises.length)];
            case 2:
                return getKanaPractice(Math.floor(Math.random() * all_kana.normal.length));
            default: break;
        }

    }

    function resetHintPos() {

        $romaji = $("#show_romaji");
        $kana = $("#show_kana");
        $kanji = $("#show_kanji");

        showRomaji($romaji.hasClass("checked"))
        showKana($kana.hasClass("checked"))
        showKanji($kanji.hasClass("checked"))

    }

    function clearCanvas() {
        let canvas = document.getElementById("draw-canvas");

        let context = canvas.getContext('2d');
        context.clearRect(
            0, 0,
            canvas.width,
            canvas.height,
        );
        strokes = 0;
    }

    function loadExercise() {
        let exercise = randomExercise();
        if (exercise.type == "word") {
            $("#instruction").text(exercise.english).css("color", "black").css("font-style", "normal");
        }
        else {
            $("#instruction").text(exercise.english.toUpperCase()).css("color", "#000099").css("font-style", "italic");
        }

        $("#sub_instruction").text(exercise.sub);
        $("#instruction_kana").text(exercise.kana);
        if (exercise.kanji)
            $("#instruction_kanji").text(exercise.kanji);
        else $("#instruction_kanji").text(exercise.kana);

        $("#instruction_romaji").text(exercise.romaji);

        currentExercise = exercise;
        $("#hintbox").css("right", -$("#hintbox").width());
        console.log(currentExercise);
        resetHintPos();
        clearCanvas();
        clearLog();

        startTimer();

    }

    showOptions(false);

});

var exercises = [];


var exe_string = `
    hello | kon'nichiwa | こんにちは
`;

function loadKana() {
    $.getJSON("./kana.json", function (data) {
        all_kana = data;
        console.log("kana retrieved.", all_kana);
    })
}
loadKana();

function getExercisesFromSource(callback) {
    function readTextFile(file) {
        var rawFile = new XMLHttpRequest();
        rawFile.open("GET", file, true);
        rawFile.onreadystatechange = function () {
            if (rawFile.readyState === 4) {
                if (rawFile.status === 200 || rawFile.status == 0) {
                    exe_string = rawFile.responseText;
                    console.log("Exercises loaded, parsing...");
                    parseExercises(callback)
                }
            }
        }
        rawFile.send(null);
    }
    readTextFile(exe_file_name);
}

function isSmallHiragana(kana) {
    if (!kana) return false;
    //small y column.
    let c = kana.charCodeAt(0);
    return (c == 12423 || c == 12419 || c == 12421);
}

function findKanaObject(k) {
    let code = k.charCodeAt(0);
    let obj = all_kana.special.find(x => (x.hiragana.code === code || x.katakana.code === code));
    if (!obj) obj = all_kana.normal.find(x => (x.hiragana.code === code || x.katakana.code === code));
    if (obj.hiragana.code === code) {
        //hiragana
        return {
            romaji: obj.romaji,
            letters: 'hiragana',
            char: obj.hiragana.char,
            code: obj.hiragana.code,
            strokes: obj.hiragana.strokes
        };
    }
    else {
        //katakana
        return {
            romaji: obj.romaji,
            letters: 'katakana',
            char: obj.katakana.char,
            code: obj.katakana.code,
            strokes: obj.katakana.strokes
        };
    }
}

function parseExercises(callback) {
    let array = exe_string.split('\n');
    let current_group = null;
    for (let a in array) {
        if (array[a].trim().length > 0) {
            let kanji_single = false;
            if (array[a][0] == "!") kanji_single = true;
            if (array[a][0] == "#") break;
            if (array[a][0] == "-") {
                current_group = array[a].trim().substr(1);
            }
            else {
                let e = array[a].split("|")

                let english = e[0].trim();
                let sub = english.match(/\(.+\)/);

                if (sub) {
                    sub = sub[0].substr(1, sub[0].length - 2);
                    english = english.split("(")[0].trim();
                }

                if (kanji_single) {
                    let strokes = parseInt(e[3]);
                    let kanji = e[2].trim();
                    english = english.substr(1)

                    //includes strokes.
                    exercises.push(
                        { type: 'word', english: english, sub, romaji: e[1].trim(), kana: kanji, group: current_group, kanji: null, strokes }
                    );
                }
                else {
                    let compounds = [];
                    let kana = e[2].trim();
                    //check for compound kana.
                    for (let k in kana) {
                        if (isSmallHiragana(kana[k])) {
                            if (isSmallHiragana(kana[k - 1])) {
                                //previous is small too - invalid compound.
                                console.error("invalid compound!");
                                break;
                            }
                            else if (compounds.length > 0) compounds[compounds.length - 1] += kana[k];
                            else console.error("invalid compound!");
                        }
                        else compounds.push(kana[k]);
                    }


                    if (e.length == 3) {
                        exercises.push({ type: 'word', english: english, sub, romaji: e[1].trim(), kana, compounds, group: current_group, kanji: null });
                    }
                    else if (e.length == 4) {
                        exercises.push({ type: 'word', english: english, sub, romaji: e[1].trim(), kana, compounds, group: current_group, kanji: e[3].trim() });
                    }
                }
            }

        }

    }
    console.log("Exercises parsed.", exercises);
    callback();

}







function parseTime(t) {
    if (t < (1000 * 10)) {
        let s = Math.floor(t / 1000);
        let cs = String(Math.floor((t % 1000) / 10)).padStart(2, '0');
        return s + "." + cs;
    }
    else if (t < (1000 * 60)) {
        let s = Math.floor(t / 1000);
        let ds = Math.floor((t % 1000) / 100);
        return s + "." + ds;
    }
    else if (t < (1000 * 60 * 10)) {
        let m = Math.floor(t / (1000 * 60));
        let s = String(Math.floor(t % (1000 * 60) / 1000)).padStart(2, '0');
        return m + ":" + s;
    }
    else if (t < (1000 * 60 * 60)) {
        let m = Math.floor(t / (1000 * 60));
        return m + "m";
    }

}

function parseTimeLong(t) {
    if (t < (1000 * 10)) {
        let s = Math.floor(t / 1000);
        let cs = Math.floor((t % 1000) / 10);
        return s + "." + cs + " s";
    }
    else if (t < (1000 * 60)) {
        let s = Math.floor(t / 1000);
        let ds = Math.floor((t % 1000) / 100);
        return s + "." + ds + " s";
    }
    else if (t < (1000 * 60 * 10)) {
        let m = Math.floor(t / (1000 * 60));
        let s = String(Math.floor(t % (1000 * 60) / 1000)).padStart(2, '0');
        return m + ":" + s;
    }
    else if (t < (1000 * 60 * 60)) {
        let m = Math.floor(t / (1000 * 60));
        return m + "m";
    }



}

window.onbeforeunload = function () {
    //return false;
}
