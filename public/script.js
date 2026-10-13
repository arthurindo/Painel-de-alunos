
const API_URL = 'http://localhost:3000/api/alunos';

// ==============================
// ELEMENTOS DO HTML
// ==============================

const form = document.getElementById('aluno-form');
const tbody = document.getElementById('alunos-tbody');

const btnCancel = document.getElementById('btn-cancel');
const btnSave = form.querySelector('.btn-save');

const InputId = document.getElementById('aluno-id');
const InputNome = document.getElementById('nome');
const InputEmail = document.getElementById('email');
const InputCurso = document.getElementById('curso');
const InputCPF = document.getElementById('cpf');
const InputDataNascimento = document.getElementById('data-nascimento');

let editandoId = null;

// ==============================
// CARREGAR ALUNOS - GET
// ==============================

async function carregarAlunos() {
    try {
        const resposta = await fetch(API_URL);

        if (!resposta.ok) {
            throw new Error('Não foi possível carregar os alunos.');
        }

        const alunos = await resposta.json();

        tbody.innerHTML = '';

        if (!Array.isArray(alunos) || alunos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center;">
                        Nenhum aluno cadastrado.
                    </td>
                </tr>
            `;
            return;
        }

        alunos.forEach(aluno => {
            const tr = document.createElement('tr');

            const dataFormatada = aluno.dataNascimento
                ? formatarData(aluno.dataNascimento)
                : '';

            [
                aluno.id,
                aluno.nome,
                aluno.email,
                aluno.cpf,
                dataFormatada,
                aluno.curso
            ].forEach(valor => {
                const td = document.createElement('td');
                td.textContent = valor ?? '';
                tr.appendChild(td);
            });

            const tdAcoes = document.createElement('td');
            tdAcoes.className = 'actions';

            const btnEditar = document.createElement('button');
            btnEditar.type = 'button';
            btnEditar.className = 'btn-edit';
            btnEditar.textContent = 'Editar';

            btnEditar.addEventListener('click', () => {
                iniciarEdicao(aluno.id);
            });

            const btnExcluir = document.createElement('button');
            btnExcluir.type = 'button';
            btnExcluir.className = 'btn-delete';
            btnExcluir.textContent = 'Excluir';

            btnExcluir.addEventListener('click', () => {
                deletarAluno(aluno.id);
            });

            tdAcoes.append(btnEditar, btnExcluir);
            tr.appendChild(tdAcoes);
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error('Erro ao carregar alunos:', error);

        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;">
                    Não foi possível carregar os alunos.
                    Verifique se o servidor está ligado.
                </td>
            </tr>
        `;
    }
}

// ==============================
// FORMATAR DATA
// ==============================

function formatarData(data) {
    // Evita problemas de fuso horário com datas YYYY-MM-DD.
    const resultado = /^(\d{4})-(\d{2})-(\d{2})/.exec(data);

    if (resultado) {
        return `${resultado[3]}/${resultado[2]}/${resultado[1]}`;
    }

    return data;
}

// ==============================
// CADASTRAR OU ATUALIZAR
// POST / PUT
// ==============================

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const aluno = {
        nome: InputNome.value.trim(),
        email: InputEmail.value.trim(),
        cpf: InputCPF.value.trim(),
        dataNascimento: InputDataNascimento.value,
        curso: InputCurso.value
    };

    if (
        !aluno.nome ||
        !aluno.email ||
        !aluno.cpf ||
        !aluno.dataNascimento ||
        !aluno.curso
    ) {
        alert('Preencha todos os campos.');
        return;
    }

    try {
        const editando = editandoId !== null;

        const url = editando
            ? `${API_URL}/${encodeURIComponent(editandoId)}`
            : API_URL;

        btnSave.disabled = true;
        btnSave.textContent = editando ? 'Atualizando...' : 'Salvando...';

        const resposta = await fetch(url, {
            method: editando ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(aluno)
        });

        if (!resposta.ok) {
            let mensagem = 'Não foi possível salvar o aluno.';

            try {
                const erro = await resposta.json();
                mensagem = erro.error || erro.erro || erro.message || mensagem;
            } catch {
                // Mantém a mensagem padrão se a resposta não for JSON.
            }

            throw new Error(mensagem);
        }

        alert(
            editando
                ? 'Aluno atualizado com sucesso!'
                : 'Aluno cadastrado com sucesso!'
        );

        resetarFormulario();
        await carregarAlunos();

    } catch (error) {
        console.error('Erro ao salvar aluno:', error);
        alert(error.message || 'Erro de conexão com o servidor.');

    } finally {
        btnSave.disabled = false;
        btnSave.textContent = editandoId !== null
            ? 'Atualizar Aluno'
            : 'Salvar Aluno';
    }
});

// ==============================
// INICIAR EDIÇÃO
// ==============================

async function iniciarEdicao(id) {
    try {
        const resposta = await fetch(API_URL);

        if (!resposta.ok) {
            throw new Error('Erro ao buscar os alunos.');
        }

        const alunos = await resposta.json();

        const aluno = alunos.find(
            item => String(item.id) === String(id)
        );

        if (!aluno) {
            alert('Aluno não encontrado.');
            return;
        }

        editandoId = aluno.id;

        InputId.value = aluno.id;
        InputNome.value = aluno.nome ?? '';
        InputEmail.value = aluno.email ?? '';
        InputCPF.value = aluno.cpf ?? '';
        InputDataNascimento.value = aluno.dataNascimento
            ? aluno.dataNascimento.substring(0, 10)
            : '';
        InputCurso.value = aluno.curso ?? '';

        btnSave.textContent = 'Atualizar Aluno';

        if (btnCancel) {
            btnCancel.style.display = 'inline-block';
        }

        const titulo = document.getElementById('form-titulo');

        if (titulo) {
            titulo.textContent = 'Editar Aluno';
        }

        form.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

    } catch (error) {
        console.error('Erro ao editar aluno:', error);
        alert(error.message || 'Erro ao buscar o aluno.');
    }
}

// ==============================
// EXCLUIR ALUNO - DELETE
// ==============================

async function deletarAluno(id) {
    const confirmar = confirm(
        'Tem certeza de que deseja excluir este aluno?'
    );

    if (!confirmar) return;

    try {
        const resposta = await fetch(
            `${API_URL}/${encodeURIComponent(id)}`,
            {
                method: 'DELETE'
            }
        );

        if (!resposta.ok) {
            let mensagem = 'Não foi possível excluir o aluno.';

            try {
                const erro = await resposta.json();
                mensagem = erro.error || erro.erro || erro.message || mensagem;
            } catch {
                // Mantém a mensagem padrão.
            }

            throw new Error(mensagem);
        }

        if (String(editandoId) === String(id)) {
            resetarFormulario();
        }

        alert('Aluno excluído com sucesso!');
        await carregarAlunos();

    } catch (error) {
        console.error('Erro ao excluir aluno:', error);
        alert(error.message || 'Erro de conexão com o servidor.');
    }
}

// ==============================
// LIMPAR FORMULÁRIO
// ==============================

function resetarFormulario() {
    editandoId = null;

    form.reset();
    InputId.value = '';

    btnSave.textContent = 'Salvar Aluno';

    if (btnCancel) {
        btnCancel.style.display = 'none';
    }

    const titulo = document.getElementById('form-titulo');

    if (titulo) {
        titulo.textContent = 'Novo Aluno';
    }
}

// ==============================
// BOTÃO CANCELAR
// ==============================

if (btnCancel) {
    btnCancel.addEventListener('click', () => {
        resetarFormulario();
    });
}

// ==============================
// INICIAR SISTEMA
// ==============================

carregarAlunos();

