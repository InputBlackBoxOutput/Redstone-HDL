const verilog_code = document.getElementById("verilog-code");
const success_alert = document.getElementById("success");
const fail_alert = document.getElementById("fail");
const synthesize_btn = document.getElementById("synthesize");
const diagram = document.getElementById("diagram-div");
const command_block_code = document.getElementById("command-block-code");

// Backend setup and switch for local development
BACKEND_ENDPOINT = "https://redstone-hdl.herokuapp.com";

const backend_switch = document.getElementById("backend-switch");
backend_switch.addEventListener('dblclick', () => {
  BACKEND_ENDPOINT = "http://localhost:5000/";
  console.log("Backend switched to localhost");
})

// Dynamically update copyright notice
const copyright = document.getElementById("copyright")
copyright.innerHTML = `Copyright © 2022-${new Date().getFullYear()}`;


// Setup CodeMirror
verilog_code.value = "module m(a,b);\n\tinput a;\n\toutput b;\n\n\tassign b = ~a;\nendmodule";

code_editor = CodeMirror.fromTextArea(verilog_code, {
  lineNumbers: true,
  tabSize: 4,
  mode: "verilog"
});

code_editor.on('change', function () {
  success_alert.hidden = true;
  fail_alert.hidden = true;
});

function generateCode(code) {
  if (fail_alert.hidden == false) {
    return;
  }

  axios.post(`${BACKEND_ENDPOINT}/synthesize`, code,
    {
      headers: {
        'Content-Type': 'text/plain'
      }
    })
    .then(async function (response) {
      command_block_code.value = response.data.output;
    })
    .catch(function (error) {
      console.log(error);
      displayMessageViaModal(
        "Something went wrong!",
        "An error occurred while creating the world."
      );
    });
}

function generateDiagram(code) {
  axios.post(`${BACKEND_ENDPOINT}/netlist`, code,
    {
      headers: {
        'Content-Type': 'text/plain'
      }
    })
    .then(async function (response) {
      if (response.data.error) {
        diagram.innerHTML = "<svg></svg>";
        success_alert.hidden = true;

        fail_alert.innerText = `Synthesis failed: ${response.data.error}`;
        fail_alert.hidden = false;
      }
      else {
        let diagram_svg = await netlistsvg.render(netlistsvg.digitalSkin, { "modules": response.data.output.modules });
        diagram.innerHTML = diagram_svg;
        success_alert.hidden = false;
        fail_alert.hidden = true;
      }
    })
    .catch(function (error) {
      console.log(error);
      displayMessageViaModal(
        "Something went wrong!",
        "An error occurred while generating the diagram."
      );
    });
}

// Setup synthesize button
synthesize_btn.addEventListener('click', async () => {
  let code = code_editor.getValue('\n');
  await generateDiagram(code);
  await generateCode(code);
})

// Generic modal
function displayMessageViaModal(messageTitle, messageContent) {
  document.getElementsByClassName('modal-title')[0].innerHTML = messageTitle;
  document.getElementsByClassName('modal-body')[0].innerHTML = messageContent;
  document.getElementById('show-modal').click();
}

// Help and about modal
document.getElementById('help').addEventListener('click', () => {
  displayMessageViaModal(
    "How to use the tool ?",
    `
    <ol>
      <li>Write verilog code for the contraption you want to build</li>
      <li>Click on the synthesize button</li>
      <li>Download the world using the world download link</li>
    </ol>
    <!-- Tutorial video -->
    `
  );
})

document.getElementById('about').addEventListener('click', () => {
  displayMessageViaModal(
    "About",
    `
    <p> A website to synthesize redstone circuits using Verilog HDL</p>
    <a target="_blank" href="https://github.com/InputBlackBoxOutput/Redstone-HDL">
        See repository on GitHub
    </a>
    <p>Created by Rutuparn Pawar [InputBlackBoxOutput]</p>
    `
  );
})

window.onload = () => {
  // Resize code textarea
  col_height = document.getElementById("verilog-code-div").clientHeight - 95;
  code_editor.setSize(null, col_height);

  // Connect with backend server
  synthesize_btn.disabled = true;

  axios.get(`${BACKEND_ENDPOINT}`)
    .then(() => {
      synthesize_btn.disabled = false
    })
    .catch((error) => {
      console.log(error);
      displayMessageViaModal("Failed to connect to the server!", "Looks like the backend server is down. Please get in touch with the administrator");
    })
};