
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

const DB_FILE = path.join(__dirname, 'db.json');

// ==============================
// MIDDLEWARE
// ==============================

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

// ==============================
// BANCO DE DADOS
// ==============================

function lerBancoDados() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(
            DB_FILE,
            JSON.stringify({ alunos: [] }, null, 2),
            'utf8'
        );
    }

    const conteudo = fs.readFileSync(DB_FILE, 'utf8');
    const db = JSON.parse(conteudo);

    if (!Array.isArray(db.alunos)) {
        throw new Error('Formato inválido no banco de dados.');
    }

    return db;
}

// ==============================
// SALVAR BANCO DE DADOS
// ==============================

function salvarBancoDados(db) {
    fs.writeFileSync(
        DB_FILE,
        JSON.stringify(db, null, 2),
        'utf8'
    );
}

// ==============================
// VALIDAR DADOS
// ==============================

function validarAluno(dados) {
    const { nome, email, cpf, dataNascimento, curso } = dados;

    if (
        typeof nome !== 'string' ||
        typeof email !== 'string' ||
        typeof cpf !== 'string' ||
        typeof dataNascimento !== 'string' ||
        typeof curso !== 'string' ||
        !nome.trim() ||
        !email.trim() ||
        !cpf.trim() ||
        !dataNascimento ||
        !curso.trim()
    ) {
        return 'Preencha todos os campos corretamente.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return 'Informe um e-mail válido.';
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
        return 'Informe uma data de nascimento válida.';
    }

    const data = new Date(`${dataNascimento}T00:00:00`);

    if (
        Number.isNaN(data.getTime()) ||
        data.toISOString().slice(0, 10) !== dataNascimento
    ) {
        return 'A data de nascimento é inválida.';
    }

    if (dataNascimento > new Date().toISOString().slice(0, 10)) {
        return 'A data de nascimento não pode ser futura.';
    }

    return null;
}

// ==============================
// CREATE - CADASTRAR ALUNO
// POST /api/alunos
// ==============================

app.post('/api/alunos', (req, res) => {
    const erro = validarAluno(req.body);

    if (erro) {
        return res.status(400).json({ error: erro });
    }

    try {
        const db = lerBancoDados();

        const novoId = db.alunos.reduce(
            (maior, aluno) => Math.max(maior, Number(aluno.id) || 0),
            0
        ) + 1;

        const novoAluno = {
            id: novoId,
            nome: req.body.nome.trim(),
            email: req.body.email.trim(),
            cpf: req.body.cpf.trim(),
            dataNascimento: req.body.dataNascimento,
            curso: req.body.curso.trim()
        };

        db.alunos.push(novoAluno);
        salvarBancoDados(db);

        return res.status(201).json(novoAluno);

    } catch (error) {
        console.error('Erro ao cadastrar aluno:', error);

        return res.status(500).json({
            error: 'Erro ao salvar aluno no banco de dados.'
        });
    }
});

// ==============================
// READ - LISTAR ALUNOS
// GET /api/alunos
// ==============================

app.get('/api/alunos', (req, res) => {
    try {
        const db = lerBancoDados();
        return res.json(db.alunos);

    } catch (error) {
        console.error('Erro ao listar alunos:', error);

        return res.status(500).json({
            error: 'Erro ao carregar alunos.'
        });
    }
});

// ==============================
// UPDATE - ATUALIZAR ALUNO
// PUT /api/alunos/:id
// ==============================

app.put('/api/alunos/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({
            error: 'ID do aluno inválido.'
        });
    }

    const erro = validarAluno(req.body);

    if (erro) {
        return res.status(400).json({ error: erro });
    }

    try {
        const db = lerBancoDados();

        const index = db.alunos.findIndex(
            aluno => Number(aluno.id) === id
        );

        if (index === -1) {
            return res.status(404).json({
                error: 'Aluno não encontrado.'
            });
        }

        db.alunos[index] = {
            ...db.alunos[index],
            nome: req.body.nome.trim(),
            email: req.body.email.trim(),
            cpf: req.body.cpf.trim(),
            dataNascimento: req.body.dataNascimento,
            curso: req.body.curso.trim()
        };

        salvarBancoDados(db);

        return res.json(db.alunos[index]);

    } catch (error) {
        console.error('Erro ao atualizar aluno:', error);

        return res.status(500).json({
            error: 'Erro ao atualizar aluno.'
        });
    }
});

// ==============================
// DELETE - EXCLUIR ALUNO
// DELETE /api/alunos/:id
// ==============================

app.delete('/api/alunos/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({
            error: 'ID do aluno inválido.'
        });
    }

    try {
        const db = lerBancoDados();

        const index = db.alunos.findIndex(
            aluno => Number(aluno.id) === id
        );

        if (index === -1) {
            return res.status(404).json({
                error: 'Aluno não encontrado.'
            });
        }

        db.alunos.splice(index, 1);
        salvarBancoDados(db);

        return res.status(204).send();

    } catch (error) {
        console.error('Erro ao excluir aluno:', error);

        return res.status(500).json({
            error: 'Erro ao excluir aluno.'
        });
    }
});

// ==============================
// TRATAMENTO DE ERROS JSON
// ==============================

app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400) {
        return res.status(400).json({
            error: 'O JSON enviado é inválido.'
        });
    }

    console.error('Erro inesperado:', error);

    return res.status(500).json({
        error: 'Ocorreu um erro interno no servidor.'
    });
});

// ==============================
// INICIAR SERVIDOR
// ==============================

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`API de alunos: http://localhost:${PORT}/api/alunos`);
    console.log(`Banco de dados: ${DB_FILE}`);
});

