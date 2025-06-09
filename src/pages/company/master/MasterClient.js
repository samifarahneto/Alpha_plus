import React, { useState, useEffect } from "react";
import { db } from "../../../firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  addDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { IoMdArrowDropup, IoMdArrowDropdown } from "react-icons/io";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";

const MasterClient = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [newType, setNewType] = useState("");
  const [showModal, setShowModal] = useState(false); // Estado para exibir modal
  const [showInfoModal, setShowInfoModal] = useState(false); // Novo estado para o modal de informação
  const [translationRates, setTranslationRates] = useState({
    pttoen: 0,
    esptoen: 0,
  });
  const [filterPtToEn, setFilterPtToEn] = useState(""); // Filtro Por/Ing
  const [filterEsToEn, setFilterEsToEn] = useState(""); // Filtro Esp/Ing
  const [filterClientType, setFilterClientType] = useState(""); // Filtro por tipo de cliente
  const [uniqueClientTypes, setUniqueClientTypes] = useState([]);
  const [registeredUserNames, setRegisteredUserNames] = useState({}); // Estado para armazenar os nomes
  const [uniquePtToEnValues, setUniquePtToEnValues] = useState([]);
  const [uniqueEsToEnValues, setUniqueEsToEnValues] = useState([]);
  const [allSelected, setAllSelected] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceInputs, setPriceInputs] = useState({
    pttoen: "",
    esptoen: "",
  });
  const [showGlobalModal, setShowGlobalModal] = useState(false);
  const [globalTranslationRates, setGlobalTranslationRates] = useState({
    pttoen: "0.00",
    esptoen: "0.00",
    b2bTimePercentage: "0.00",
    b2bPricePercentage: "0.00",
    b2cTimePercentage: "0.00",
    b2cPricePercentage: "0.00",
    price_home: "0.00",
  });
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const savedItemsPerPage = localStorage.getItem("masterClientItemsPerPage");
    return savedItemsPerPage ? Number(savedItemsPerPage) : 10;
  });

  useEffect(() => {
    const fetchGlobalRates = async () => {
      try {
        const priceDocRef = doc(db, "priceperpage", "price");
        const priceDoc = await getDoc(priceDocRef);
        if (priceDoc.exists()) {
          const data = priceDoc.data();
          setGlobalTranslationRates({
            pttoen: Number(data.pttoen).toFixed(2) || "0.00",
            esptoen: Number(data.esptoen).toFixed(2) || "0.00",
            b2bTimePercentage:
              Number(data.b2bTimePercentage).toFixed(2) || "0.00",
            b2bPricePercentage:
              Number(data.b2bPricePercentage).toFixed(2) || "0.00",
            b2cTimePercentage:
              Number(data.b2cTimePercentage).toFixed(2) || "0.00",
            b2cPricePercentage:
              Number(data.b2cPricePercentage).toFixed(2) || "0.00",
            price_home: Number(data.price_home).toFixed(2) || "0.00",
          });
        }
      } catch (error) {
        console.error("Erro ao buscar os valores globais:", error);
      }
    };

    fetchGlobalRates();
  }, []);

  const handleSaveGlobalRates = async () => {
    try {
      const formatValue = (value) => {
        if (!value) return "0.00";
        const cleanValue = value.toString().replace(/[^0-9,.]/g, "");
        const normalizedValue = cleanValue.replace(",", ".");
        return (parseFloat(normalizedValue) || 0).toFixed(2);
      };

      const formattedRates = {
        pttoen: formatValue(globalTranslationRates.pttoen),
        esptoen: formatValue(globalTranslationRates.esptoen),
        b2bTimePercentage: formatValue(
          globalTranslationRates.b2bTimePercentage
        ),
        b2bPricePercentage: formatValue(
          globalTranslationRates.b2bPricePercentage
        ),
        b2cTimePercentage: formatValue(
          globalTranslationRates.b2cTimePercentage
        ),
        b2cPricePercentage: formatValue(
          globalTranslationRates.b2cPricePercentage
        ),
        price_home: formatValue(globalTranslationRates.price_home),
      };

      // Buscar valores atuais do Firestore
      const priceDocRef = doc(db, "priceperpage", "price");
      const priceDoc = await getDoc(priceDocRef);
      const currentValues = priceDoc.exists() ? priceDoc.data() : {};

      // Criar log apenas com os valores alterados
      const valoresAlterados = {};
      const valoresAnterioresAlterados = {};

      // Comparar cada valor para verificar alterações
      Object.keys(formattedRates).forEach((key) => {
        const valorAnterior = currentValues[key] || "0.00";
        const valorNovo = formattedRates[key];

        // Comparar strings formatadas
        if (valorNovo !== valorAnterior) {
          valoresAlterados[key] = valorNovo;
          valoresAnterioresAlterados[key] = valorAnterior;
        }
      });

      // Atualizar documento global
      await setDoc(doc(db, "global", "rates"), {
        ...formattedRates,
        updatedAt: serverTimestamp(),
      });

      // Atualizar documento priceperpage para manter compatibilidade
      await setDoc(doc(db, "priceperpage", "price"), {
        ...formattedRates,
        updatedAt: serverTimestamp(),
      });

      // Criar log da alteração apenas se houver mudanças
      if (Object.keys(valoresAlterados).length > 0) {
        console.log("Valores alterados:", valoresAlterados);
        console.log("Valores anteriores:", valoresAnterioresAlterados);

        const logData = {
          timestamp: serverTimestamp(),
          userEmail: "@Master",
          action: "alteração de valores globais",
          details: {
            valoresAnteriores: valoresAnterioresAlterados,
            valoresNovos: valoresAlterados,
          },
        };

        // Adicionar log
        await addDoc(collection(db, "activity_logs"), logData);
        console.log("Log criado com sucesso:", logData);
      }

      // Atualizar estado local mantendo os valores não alterados
      setGlobalTranslationRates((prev) => ({
        ...prev,
        ...formattedRates,
      }));
      setTranslationRates((prev) => ({
        ...prev,
        ...formattedRates,
      }));
      setShowGlobalModal(false);
      alert("Valores globais atualizados com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar os valores globais:", error);
      alert(
        "Erro ao atualizar os valores globais. Por favor, tente novamente."
      );
    }
  };

  const handleCancelGlobalRates = () => {
    setGlobalTranslationRates(translationRates); // Restaura os valores originais
    setShowGlobalModal(false); // Fecha o modal
  };

  const handleOpenPriceModal = () => {
    setPriceInputs({ pttoen: "", esptoen: "" }); // Inicializa os inputs em branco
    setShowPriceModal(true);
  };

  const handleClosePriceModal = () => {
    setShowPriceModal(false);
  };

  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    setPriceInputs((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSavePrices = async () => {
    try {
      const updates = [];
      const clientesAtualizados = [];

      console.log("Iniciando atualização de preços...");
      console.log("Inputs recebidos:", priceInputs);

      for (const user of filteredClients.filter(
        (user) => user.isSelected && user.userType !== "colab"
      )) {
        console.log("Processando usuário:", user.email);

        const valoresAnteriores = {
          pttoen: user.pttoen || "0.00",
          esptoen: user.esptoen || "0.00",
        };

        const valoresNovos = {
          pttoen: priceInputs.pttoen || user.pttoen || "0.00",
          esptoen: priceInputs.esptoen || user.esptoen || "0.00",
        };

        console.log("Valores anteriores:", valoresAnteriores);
        console.log("Valores novos:", valoresNovos);

        // Verificar se houve alterações
        const houveAlteracao =
          valoresNovos.pttoen !== valoresAnteriores.pttoen ||
          valoresNovos.esptoen !== valoresAnteriores.esptoen;

        console.log("Houve alteração?", houveAlteracao);

        if (houveAlteracao) {
          console.log("Atualizando usuário:", user.email);
          const userUpdate = updateDoc(doc(db, "users", user.id), {
            pttoen: valoresNovos.pttoen,
            esptoen: valoresNovos.esptoen,
          });
          updates.push(userUpdate);

          clientesAtualizados.push({
            email: user.email,
            nome: user.nomeCompleto,
            valoresAnteriores,
            valoresNovos,
          });

          if (user.userType === "b2c" || user.userType === "b2b") {
            console.log("Buscando colaboradores para:", user.email);
            const colabQuery = query(
              collection(db, "users"),
              where("registeredBy", "==", user.email),
              where("userType", "==", "colab"),
              where("registeredByType", "==", user.userType)
            );

            const colabSnapshot = await getDocs(colabQuery);
            console.log("Colaboradores encontrados:", colabSnapshot.size);

            colabSnapshot.docs.forEach((colabDoc) => {
              const colabData = colabDoc.data();
              const colabValoresAnteriores = {
                pttoen: colabData.pttoen || "0.00",
                esptoen: colabData.esptoen || "0.00",
              };

              const colabValoresNovos = {
                pttoen: valoresNovos.pttoen,
                esptoen: valoresNovos.esptoen,
              };

              console.log("Atualizando colaborador:", colabData.email);
              const colabUpdate = updateDoc(doc(db, "users", colabDoc.id), {
                pttoen: colabValoresNovos.pttoen,
                esptoen: colabValoresNovos.esptoen,
              });
              updates.push(colabUpdate);

              clientesAtualizados.push({
                email: colabData.email,
                nome: colabData.nomeCompleto,
                valoresAnteriores: colabValoresAnteriores,
                valoresNovos: colabValoresNovos,
              });
            });
          }
        }
      }

      console.log("Total de atualizações:", updates.length);
      console.log("Clientes atualizados:", clientesAtualizados);

      if (updates.length > 0) {
        console.log("Executando atualizações...");
        await Promise.all(updates);

        // Criar log da ação apenas se houver alterações
        const logData = {
          timestamp: serverTimestamp(),
          userEmail: "@Master",
          action: "alteração de preços",
          details: {
            usuariosAfetados: clientesAtualizados,
          },
        };

        console.log("Criando log com dados:", logData);
        await addDoc(collection(db, "activity_logs"), logData);
        console.log("Log criado com sucesso!");
      } else {
        console.log("Nenhuma atualização necessária");
      }

      setClients((prevClients) =>
        prevClients.map((user) => {
          if (user.isSelected) {
            return {
              ...user,
              pttoen: priceInputs.pttoen || user.pttoen,
              esptoen: priceInputs.esptoen || user.esptoen,
            };
          }
          if (user.userType === "colab") {
            const linkedClient = filteredClients.find(
              (selected) =>
                selected.isSelected &&
                selected.email === user.registeredBy &&
                (selected.userType === "b2c" || selected.userType === "b2b")
            );
            if (linkedClient) {
              return {
                ...user,
                pttoen: priceInputs.pttoen || linkedClient.pttoen,
                esptoen: priceInputs.esptoen || linkedClient.esptoen,
              };
            }
          }
          return user;
        })
      );

      setShowPriceModal(false);
      alert(
        "Preços atualizados com sucesso para clientes e colaboradores vinculados!"
      );
    } catch (error) {
      console.error("Erro ao atualizar os preços:", error);
      alert("Ocorreu um erro ao salvar os preços.");
    }
  };

  const filteredClients = clients.filter((client) => {
    const matchesPtToEn =
      filterPtToEn === "" || Number(client.pttoen) === Number(filterPtToEn);
    const matchesEsToEn =
      filterEsToEn === "" || Number(client.esptoen) === Number(filterEsToEn);

    // Mapear o filterClientType para o userType correspondente
    let userTypeFilter = "";
    if (filterClientType === "B2C") {
      userTypeFilter = "b2c";
    } else if (filterClientType === "B2B") {
      userTypeFilter = "b2b";
    } else if (filterClientType === "Colab") {
      userTypeFilter = "colab";
    }

    const matchesClientType =
      filterClientType === "" || client.userType === userTypeFilter;

    return matchesPtToEn && matchesEsToEn && matchesClientType;
  });

  // Lógica de paginação
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredClients.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleItemsPerPageChange = (value) => {
    const newValue = Number(value);
    setItemsPerPage(newValue);
    setCurrentPage(1);
    localStorage.setItem("masterClientItemsPerPage", newValue);
  };

  const renderPagination = () => {
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(
      currentPage * itemsPerPage,
      filteredClients.length
    );
    const totalItems = filteredClients.length;

    return (
      <div className="flex flex-col items-center gap-4 mt-4">
        <div className="text-sm text-gray-600 text-center">
          Mostrando {startItem} a {endItem} de {totalItems} itens
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Itens por página:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(e.target.value)}
              className="w-auto min-w-[60px] h-7 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-300 transition-colors appearance-none cursor-pointer pr-6 pl-2 py-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.5rem center",
                backgroundSize: "1.5em 1.5em",
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-md ${
                currentPage === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              } border border-gray-200`}
            >
              Anterior
            </button>
            {pageNumbers.map((number) => (
              <button
                key={number}
                onClick={() => handlePageChange(number)}
                className={`px-3 py-1 rounded-md ${
                  currentPage === number
                    ? "bg-blue-50 text-blue-600 border-blue-200"
                    : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
                } border`}
              >
                {number}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-md ${
                currentPage === totalPages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              } border border-gray-200`}
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    );
  };

  const isAnySelected = filteredClients.some(
    (client) =>
      client.isSelected &&
      (client.userType === "b2b" || client.userType === "b2c")
  );

  const handleSelectAll = () => {
    setClients((prevClients) =>
      prevClients.map((client) =>
        filteredClients.some((filtered) => filtered.id === client.id) &&
        (client.userType === "b2b" || client.userType === "b2c")
          ? { ...client, isSelected: !allSelected }
          : client
      )
    );
    setAllSelected(!allSelected);
  };

  // Função para buscar o nome do usuário pelo email
  const fetchUserNameByEmail = async (email) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        return userData.nomeCompleto || "N/A"; // Retorna o nome do usuário, ou "N/A" caso não exista
      } else {
        return "N/A"; // Caso nenhum usuário seja encontrado
      }
    } catch (error) {
      console.error("Erro ao buscar usuário pelo email:", error);
      return "Erro";
    }
  };

  // Atualiza os nomes dos usuários associados ao registeredBy
  useEffect(() => {
    const fetchRegisteredUserNames = async () => {
      const namesMap = {};
      for (const client of clients) {
        if (client.registeredBy) {
          const name = await fetchUserNameByEmail(client.registeredBy);
          namesMap[client.registeredBy] = name;
        }
      }
      setRegisteredUserNames(namesMap); // Atualiza o estado com os nomes buscados
    };

    if (clients.length > 0) {
      fetchRegisteredUserNames();
    }
  }, [clients]);

  const fetchTranslationRatesFromPrice = async () => {
    try {
      const priceDocRef = doc(db, "priceperpage", "price");
      const priceDoc = await getDoc(priceDocRef);

      if (priceDoc.exists()) {
        const data = priceDoc.data();
        console.log("Valores de tradução:", data);
        return {
          pttoen: Number(data.pttoen) || 0,
          esptoen: Number(data.esptoen) || 0,
        };
      } else {
        console.error(
          "Documento 'price' não encontrado na coleção 'priceperpage'."
        );
        return { pttoen: 0, esptoen: 0 };
      }
    } catch (error) {
      console.error("Erro ao buscar os valores de tradução:", error);
      return { pttoen: 0, esptoen: 0 };
    }
  };

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const rates = await fetchTranslationRatesFromPrice(); // Busca as taxas de tradução
        setTranslationRates(rates); // Atualiza o estado com os valores buscados
      } catch (error) {
        console.error("Erro ao buscar as taxas de tradução:", error);
      }
    };

    fetchRates(); // Chama a função para inicializar as taxas de tradução
  }, []);

  useEffect(() => {
    const saveTranslationRates = async () => {
      try {
        const priceDocRef = doc(db, "priceperpage", "price");
        await updateDoc(priceDocRef, {
          pttoen: translationRates.pttoen,
          esptoen: translationRates.esptoen,
        });
        console.log("Valores de tradução atualizados com sucesso!");
      } catch (error) {
        console.error("Erro ao atualizar os valores de tradução:", error);
      }
    };

    if (translationRates.pttoen !== 0 || translationRates.esptoen !== 0) {
      saveTranslationRates();
    }
  }, [translationRates]);

  useEffect(() => {
    const usersCollection = collection(db, "users");

    const clientQuery = query(
      usersCollection,
      where("userType", "in", ["b2c", "colab", "b2b"])
    );

    const unsubscribe = onSnapshot(clientQuery, (snapshot) => {
      const clientList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Ordenar a lista para mostrar B2B primeiro, depois B2C e por último Colab
      const sortedClientList = clientList.sort((a, b) => {
        const order = { b2b: 0, b2c: 1, colab: 2 };
        return order[a.userType] - order[b.userType];
      });

      setClients(sortedClientList);

      console.log("Lista de usuários completa:", sortedClientList);

      // Atualizar tipos de clientes únicos
      const clientTypes = [
        ...new Set(
          sortedClientList.map((client) => {
            if (client.userType === "b2b") return "B2B";
            if (client.userType === "b2c") return "B2C";
            if (client.userType === "colab") return "Colab";
            return "Desconhecido";
          })
        ),
      ];
      setUniqueClientTypes(clientTypes);

      // Processar Por/Ing (pttoen)
      const ptToEnValues = sortedClientList
        .map((client) => {
          const value = Number(client.pttoen);
          console.log(`Por/Ing: ${value}, Email: ${client.email}`);
          return value;
        })
        .filter((value) => !isNaN(value))
        .filter((value, index, self) => self.indexOf(value) === index)
        .sort((a, b) => a - b);

      // Processar Esp/Ing (esptoen)
      const esToEnValues = sortedClientList
        .map((client) => {
          const value = Number(client.esptoen);
          console.log(`Esp/Ing: ${value}, Email: ${client.email}`);
          return value;
        })
        .filter((value) => !isNaN(value))
        .filter((value, index, self) => self.indexOf(value) === index)
        .sort((a, b) => a - b);

      console.log("Valores únicos Por/Ing:", ptToEnValues);
      console.log("Valores únicos Esp/Ing:", esToEnValues);

      setUniquePtToEnValues(ptToEnValues);
      setUniqueEsToEnValues(esToEnValues);
    });

    return () => unsubscribe();
  }, []);

  const handleTypeChangeRequest = (clientId, type) => {
    setSelectedClient(clientId);
    setNewType(type);
    setShowModal(true); // Exibe o modal
  };

  const handleTypeChangeConfirm = async () => {
    try {
      const clientDocRef = doc(db, "users", selectedClient);
      const clientDoc = await getDoc(clientDocRef);
      const clientData = clientDoc.data();

      // Validação do tipo
      let userType;
      if (newType === "B2C") {
        userType = "b2c";
      } else if (newType === "B2B") {
        userType = "b2b";
      } else if (newType === "Colab") {
        userType = "colab";
      } else {
        throw new Error("Tipo de cliente inválido");
      }

      // Preparar atualizações
      const updates = {
        clientType: newType,
        userType: userType,
      };

      // Se for B2B, remover registeredBy
      if (newType === "B2B") {
        updates.registeredBy = null;
      }

      // Atualizar documento
      await updateDoc(clientDocRef, updates);

      // Criar log
      const logData = {
        timestamp: serverTimestamp(),
        userEmail: "@Master",
        action: "alteração de tipo de cliente",
        details: {
          cliente: {
            email: clientData.email || "",
            nome: clientData.nomeCompleto || "",
          },
          tipoAnterior: clientData.clientType || "",
          tipoNovo: newType,
          userTypeAnterior: clientData.userType || "",
          userTypeNovo: userType,
        },
      };

      await addDoc(collection(db, "activity_logs"), logData);

      console.log(
        `Tipo atualizado para ${newType} (${userType}) para o cliente ${selectedClient}`
      );
    } catch (error) {
      console.error("Erro ao atualizar o tipo do cliente:", error);
      alert("Erro ao atualizar o tipo do cliente. Por favor, tente novamente.");
    } finally {
      setShowModal(false);
    }
  };

  const handleTypeChangeCancel = () => {
    setShowModal(false); // Fecha o modal sem alterações
  };

  const handleSort = (field) => {
    const newDirection =
      field === sortField && sortDirection === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortDirection(newDirection);

    const sortedClients = [...clients].sort((a, b) => {
      let compareA, compareB;

      switch (field) {
        case "email":
          compareA = a.email?.toLowerCase() || "";
          compareB = b.email?.toLowerCase() || "";
          break;
        case "nomeCompleto":
          compareA = a.nomeCompleto?.toLowerCase() || "";
          compareB = b.nomeCompleto?.toLowerCase() || "";
          break;
        case "clientType":
          compareA = a.clientType?.toLowerCase() || "";
          compareB = b.clientType?.toLowerCase() || "";
          break;
        case "registeredBy":
          compareA = registeredUserNames[a.registeredBy]?.toLowerCase() || "";
          compareB = registeredUserNames[b.registeredBy]?.toLowerCase() || "";
          break;
        case "pttoen":
          compareA = Number(a.pttoen) || 0;
          compareB = Number(b.pttoen) || 0;
          break;
        case "esptoen":
          compareA = Number(a.esptoen) || 0;
          compareB = Number(b.esptoen) || 0;
          break;
        case "userType":
          compareA = a.userType?.toLowerCase() || "";
          compareB = b.userType?.toLowerCase() || "";
          break;
        default:
          return 0;
      }

      if (compareA < compareB) return newDirection === "asc" ? -1 : 1;
      if (compareA > compareB) return newDirection === "asc" ? 1 : -1;
      return 0;
    });

    setClients(sortedClients);
  };

  const handleEnableTest = async (clientId, currentState) => {
    try {
      const newState = !currentState;
      const userRef = doc(db, "users", clientId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      // Preparar dados para o log
      const usuariosAfetados = [
        {
          nome:
            userData.nomeCompleto ||
            userData.email?.split("@")[0] ||
            "Não informado",
          email: userData.email || "Não informado",
          habilitado: newState,
        },
      ];

      // Adicionar colaboradores ao log se existirem
      const colabQuery = query(
        collection(db, "users"),
        where("registeredBy", "==", userData.email),
        where("userType", "==", "colab"),
        where("registeredByType", "==", userData.userType)
      );
      const colabSnapshot = await getDocs(colabQuery);

      // Atualizar o usuário principal
      await updateDoc(userRef, {
        canTest: newState,
      });

      // Atualizar os colaboradores
      const colabUpdates = colabSnapshot.docs.map((colabDoc) =>
        updateDoc(doc(db, "users", colabDoc.id), {
          canTest: newState,
        })
      );

      await Promise.all(colabUpdates);

      // Adicionar colaboradores ao log
      colabSnapshot.docs.forEach((colabDoc) => {
        const colabData = colabDoc.data();
        usuariosAfetados.push({
          nome:
            colabData.nomeCompleto ||
            colabData.email?.split("@")[0] ||
            "Não informado",
          email: colabData.email || "Não informado",
          habilitado: newState,
        });
      });

      // Criar log da ação
      const logData = {
        timestamp: serverTimestamp(),
        userEmail: "@Master",
        action: `botão de aprovação ${
          newState ? "habilitado" : "desabilitado"
        }`,
        details: {
          usuario: {
            nome:
              userData.nomeCompleto ||
              userData.email?.split("@")[0] ||
              "Não informado",
            email: userData.email || "Não informado",
          },
        },
      };

      await addDoc(collection(db, "activity_logs"), logData);

      // Atualizar o estado local
      setClients((prevClients) =>
        prevClients.map((c) => {
          if (c.id === clientId) {
            return { ...c, canTest: newState };
          }
          if (c.registeredBy === userData.email && c.userType === "colab") {
            return { ...c, canTest: newState };
          }
          return c;
        })
      );
    } catch (error) {
      console.error("Erro ao alterar estado do botão:", error);
      alert("Erro ao atualizar a configuração. Tente novamente.");
    }
  };

  return (
    <div className="w-full max-w-full pt-0 pb-4 sm:pb-6 md:pb-8 space-y-4 sm:space-y-6 md:space-y-8">
      <div className="text-center mb-6 lg:mb-8">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Usuários
        </h1>
      </div>
      <div className="text-center mb-4 md:mb-8">
        <div className="w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-3 md:p-6">
          {/* Grid principal - 1 coluna no mobile, 3 colunas no desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Valores por Página */}
            <div className="w-full bg-gradient-to-br from-blue-50 to-white rounded-xl p-3 md:p-4 border border-blue-100">
              <h4 className="font-medium text-gray-700 mb-2 md:mb-3 flex items-center justify-center gap-2 text-sm md:text-base">
                <span className="bg-blue-500 p-1.5 md:p-2 rounded-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 md:h-4 md:w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </span>
                Valores por Página
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                <div className="bg-white rounded-lg p-2 md:p-3 shadow-sm border border-gray-100 h-[80px] flex flex-col justify-center">
                  <label className="block text-xs md:text-sm text-gray-600 mb-1">
                    Português:
                  </label>
                  <span className="text-base md:text-lg font-bold text-blue-600">
                    U$: {globalTranslationRates.pttoen}
                  </span>
                </div>
                <div className="bg-white rounded-lg p-2 md:p-3 shadow-sm border border-gray-100 h-[80px] flex flex-col justify-center">
                  <label className="block text-xs md:text-sm text-gray-600 mb-1">
                    Espanhol:
                  </label>
                  <span className="text-base md:text-lg font-bold text-blue-600">
                    U$: {globalTranslationRates.esptoen}
                  </span>
                </div>
                <div className="bg-white rounded-lg p-2 md:p-3 shadow-sm border border-gray-100 h-[80px] flex flex-col justify-center">
                  <label className="block text-xs md:text-sm text-gray-600 mb-1">
                    Valor na Home:
                  </label>
                  <span className="text-base md:text-lg font-bold text-blue-600">
                    U$: {globalTranslationRates.price_home}
                  </span>
                </div>
              </div>
            </div>

            {/* Percentuais B2B */}
            <div className="w-full bg-gradient-to-br from-purple-50 to-white rounded-xl p-3 md:p-4 border border-purple-100">
              <h4 className="font-medium text-gray-700 mb-2 md:mb-3 flex items-center justify-center gap-2 text-sm md:text-base">
                <span className="bg-purple-500 p-1.5 md:p-2 rounded-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 md:h-4 md:w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </span>
                Prioridades B2B
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                <div className="bg-white rounded-lg p-2 md:p-3 shadow-sm border border-gray-100 h-[80px] flex flex-col justify-center">
                  <label className="block text-xs md:text-sm text-gray-600 mb-1">
                    Desconto no Tempo:
                  </label>
                  <span className="text-base md:text-lg font-bold text-purple-600 flex items-center justify-center gap-1">
                    {globalTranslationRates.b2bTimePercentage}%
                    <IoMdArrowDropdown className="text-red-500" />
                  </span>
                </div>
                <div className="bg-white rounded-lg p-2 md:p-3 shadow-sm border border-gray-100 h-[80px] flex flex-col justify-center">
                  <label className="block text-xs md:text-sm text-gray-600 mb-1">
                    Acréscimo no Preço:
                  </label>
                  <span className="text-base md:text-lg font-bold text-purple-600 flex items-center justify-center gap-1">
                    {globalTranslationRates.b2bPricePercentage}%
                    <IoMdArrowDropup className="text-green-500" />
                  </span>
                </div>
              </div>
            </div>

            {/* Percentuais B2C */}
            <div className="w-full bg-gradient-to-br from-green-50 to-white rounded-xl p-3 md:p-4 border border-green-100">
              <h4 className="font-medium text-gray-700 mb-2 md:mb-3 flex items-center justify-center gap-2 text-sm md:text-base">
                <span className="bg-green-500 p-1.5 md:p-2 rounded-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 md:h-4 md:w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </span>
                Prioridades B2C
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                <div className="bg-white rounded-lg p-2 md:p-3 shadow-sm border border-gray-100 h-[80px] flex flex-col justify-center">
                  <label className="block text-xs md:text-sm text-gray-600 mb-1">
                    Desconto no Tempo:
                  </label>
                  <span className="text-base md:text-lg font-bold text-green-600 flex items-center justify-center gap-1">
                    {globalTranslationRates.b2cTimePercentage}%
                    <IoMdArrowDropdown className="text-red-500" />
                  </span>
                </div>
                <div className="bg-white rounded-lg p-2 md:p-3 shadow-sm border border-gray-100 h-[80px] flex flex-col justify-center">
                  <label className="block text-xs md:text-sm text-gray-600 mb-1">
                    Acréscimo no Preço:
                  </label>
                  <span className="text-base md:text-lg font-bold text-green-600 flex items-center justify-center gap-1">
                    {globalTranslationRates.b2cPricePercentage}%
                    <IoMdArrowDropup className="text-green-500" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 md:mb-8">
        {/* Cabeçalho com Filtros e Botões */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-3 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Filtros */}
            <div className="w-full md:w-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">
                  Por/Ing:
                </label>
                <div className="relative flex-1 w-[120px]">
                  <select
                    value={filterPtToEn}
                    className="w-full h-7 text-[11px] md:text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-300 transition-colors appearance-none cursor-pointer pr-6 pl-2 py-0"
                    onChange={(e) => setFilterPtToEn(e.target.value)}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 0.5rem center",
                      backgroundSize: "1.5em 1.5em",
                    }}
                  >
                    <option value="" className="text-[11px] md:text-xs py-0">
                      Todos
                    </option>
                    {uniquePtToEnValues.map((value) => (
                      <option
                        key={value}
                        value={value}
                        className="text-[11px] md:text-xs py-0"
                      >
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">
                  Esp/Ing:
                </label>
                <div className="relative flex-1 w-[120px]">
                  <select
                    value={filterEsToEn}
                    className="w-full h-7 text-[11px] md:text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-300 transition-colors appearance-none cursor-pointer pr-6 pl-2 py-0"
                    onChange={(e) => setFilterEsToEn(e.target.value)}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 0.5rem center",
                      backgroundSize: "1.5em 1.5em",
                    }}
                  >
                    <option value="" className="text-[11px] md:text-xs py-0">
                      Todos
                    </option>
                    {uniqueEsToEnValues.map((value) => (
                      <option
                        key={value}
                        value={value}
                        className="text-[11px] md:text-xs py-0"
                      >
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">
                  Tipo de Cliente:
                </label>
                <div className="relative flex-1 w-[120px]">
                  <select
                    value={
                      filterClientType === "Cliente" ? "B2C" : filterClientType
                    }
                    className="w-full h-7 text-[11px] md:text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-300 transition-colors appearance-none cursor-pointer pr-6 pl-2 py-0"
                    onChange={(e) =>
                      setFilterClientType(
                        e.target.value === "B2C" ? "Cliente" : e.target.value
                      )
                    }
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 0.5rem center",
                      backgroundSize: "1.5em 1.5em",
                    }}
                  >
                    <option value="" className="text-[11px] md:text-xs py-0">
                      Todos
                    </option>
                    {uniqueClientTypes.map((type) => {
                      let displayType = type;
                      if (type === "Cliente") displayType = "B2C";
                      return (
                        <option
                          key={type}
                          value={type === "Cliente" ? "B2C" : type}
                          className="text-[11px] md:text-xs py-0"
                        >
                          {displayType}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="w-full md:w-auto grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                disabled={!isAnySelected}
                onClick={handleOpenPriceModal}
                className={`btn ${
                  isAnySelected
                    ? "bg-blue-50 hover:bg-blue-100 text-blue-600"
                    : "bg-gray-50 text-gray-400 cursor-not-allowed"
                } border border-gray-200 rounded-full px-3 py-1.5 text-xs md:text-sm font-medium transition-all duration-200`}
              >
                Alterar Preços
              </button>

              <button
                onClick={() => setShowGlobalModal(true)}
                className="btn bg-blue-50 hover:bg-blue-100 text-blue-600 border border-gray-200 rounded-full px-3 py-1.5 text-xs md:text-sm font-medium transition-all duration-200"
              >
                Alterar Valor Global
              </button>

              <button
                onClick={handleSelectAll}
                className="btn bg-blue-50 hover:bg-blue-100 text-blue-600 border border-gray-200 rounded-full px-3 py-1.5 text-xs md:text-sm font-medium transition-all duration-200"
              >
                {allSelected ? "Desmarcar" : "Sel. Todos"}
              </button>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="w-[25%] px-2 py-2 text-left text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span
                        className="cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleSort("nomeCompleto")}
                      >
                        Nome
                        {sortField === "nomeCompleto" &&
                          (sortDirection === "asc" ? (
                            <IoMdArrowDropup className="inline ml-1" />
                          ) : (
                            <IoMdArrowDropdown className="inline ml-1" />
                          ))}
                      </span>
                    </div>
                  </th>
                  <th className="w-[25%] px-2 py-2 text-left text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span
                        className="cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleSort("email")}
                      >
                        Email
                        {sortField === "email" &&
                          (sortDirection === "asc" ? (
                            <IoMdArrowDropup className="inline ml-1" />
                          ) : (
                            <IoMdArrowDropdown className="inline ml-1" />
                          ))}
                      </span>
                    </div>
                  </th>
                  <th className="w-[25%] px-2 py-2 text-left text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span
                        className="cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleSort("registeredBy")}
                      >
                        Registrado
                        {sortField === "registeredBy" &&
                          (sortDirection === "asc" ? (
                            <IoMdArrowDropup className="inline ml-1" />
                          ) : (
                            <IoMdArrowDropdown className="inline ml-1" />
                          ))}
                      </span>
                    </div>
                  </th>
                  <th className="w-[5%] px-2 py-2 text-left text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span
                        className="cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleSort("clientType")}
                      >
                        Tipo
                        {sortField === "clientType" &&
                          (sortDirection === "asc" ? (
                            <IoMdArrowDropup className="inline ml-1" />
                          ) : (
                            <IoMdArrowDropdown className="inline ml-1" />
                          ))}
                      </span>
                    </div>
                  </th>
                  <th className="w-[5%] px-2 py-2 text-left text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span
                        className="cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleSort("pttoen")}
                      >
                        Por/Ing
                        {sortField === "pttoen" &&
                          (sortDirection === "asc" ? (
                            <IoMdArrowDropup className="inline ml-1" />
                          ) : (
                            <IoMdArrowDropdown className="inline ml-1" />
                          ))}
                      </span>
                    </div>
                  </th>
                  <th className="w-[5%] px-2 py-2 text-left text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span
                        className="cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleSort("esptoen")}
                      >
                        Esp/Ing
                        {sortField === "esptoen" &&
                          (sortDirection === "asc" ? (
                            <IoMdArrowDropup className="inline ml-1" />
                          ) : (
                            <IoMdArrowDropdown className="inline ml-1" />
                          ))}
                      </span>
                    </div>
                  </th>
                  <th className="w-[5%] px-2 py-2 text-left text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      Aprovação{" "}
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        className="text-gray-500 hover:text-gray-700 cursor-pointer ml-1"
                        onClick={() => setShowInfoModal(true)}
                      />
                    </div>
                  </th>
                  <th className="w-[5%] px-2 py-2 text-center text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">
                    Sel.
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentItems.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-2 py-2 text-xs md:text-sm text-gray-700">
                      <div className="flex items-center">
                        <span className="truncate max-w-[150px]">
                          {client.nomeCompleto || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-xs md:text-sm text-gray-700">
                      <div className="flex items-center">
                        <span className="truncate max-w-[150px]">
                          {client.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-xs md:text-sm text-gray-700">
                      <div className="flex items-center">
                        <span className="truncate max-w-[150px]">
                          {client.registeredBy || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-xs md:text-sm text-gray-700">
                      <div className="relative flex-1">
                        <select
                          value={
                            client.userType === "b2b"
                              ? "B2B"
                              : client.userType === "b2c"
                              ? "B2C"
                              : client.userType === "colab"
                              ? "Colab"
                              : "Desconhecido"
                          }
                          onChange={(e) =>
                            handleTypeChangeRequest(client.id, e.target.value)
                          }
                          disabled={client.userType === "colab"}
                          className="w-full min-w-[80px] h-7 text-[11px] md:text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-300 transition-colors appearance-none cursor-pointer pr-6 pl-2 py-0"
                        >
                          {client.userType === "colab" ? (
                            <option
                              value="Colab"
                              className="text-[11px] md:text-xs py-1"
                            >
                              Colab
                            </option>
                          ) : (
                            <>
                              <option
                                value="B2C"
                                className="text-[11px] md:text-xs py-1"
                              >
                                B2C
                              </option>
                              <option
                                value="B2B"
                                className="text-[11px] md:text-xs py-1"
                              >
                                B2B
                              </option>
                            </>
                          )}
                        </select>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-xs md:text-sm text-gray-700">
                      <input
                        type="number"
                        value={client.pttoen || ""}
                        readOnly
                        className="w-full h-8 text-xs md:text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent px-2"
                      />
                    </td>
                    <td className="px-2 py-2 text-xs md:text-sm text-gray-700">
                      <input
                        type="number"
                        value={client.esptoen || ""}
                        readOnly
                        className="w-full h-8 text-xs md:text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent px-2"
                      />
                    </td>
                    <td className="px-2 py-2 text-xs md:text-sm text-gray-700">
                      {client.userType === "b2b" && (
                        <button
                          onClick={() =>
                            handleEnableTest(client.id, client.canTest)
                          }
                          className={`relative inline-flex items-center h-5 w-10 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                            client.canTest ? "bg-green-500" : "bg-gray-300"
                          }`}
                          role="switch"
                          aria-checked={client.canTest}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
                              client.canTest ? "translate-x-5" : "translate-x-1"
                            }`}
                          />
                        </button>
                      )}
                      {client.userType === "b2c" && (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center text-xs md:text-sm text-gray-700">
                      {client.userType !== "colab" ? (
                        <input
                          type="checkbox"
                          checked={client.isSelected || false}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setClients((prevClients) => {
                              const updatedClients = prevClients.map((c) =>
                                c.id === client.id
                                  ? { ...c, isSelected: isChecked }
                                  : c
                              );

                              const allChecked = updatedClients.every((c) =>
                                filteredClients.some(
                                  (filtered) => filtered.id === c.id
                                )
                                  ? c.isSelected
                                  : true
                              );
                              setAllSelected(allChecked);

                              return updatedClients;
                            });
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Paginação */}
      <div className="bg-white rounded-2xl p-3">{renderPagination()}</div>

      {/* Modais */}
      {showPriceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-4 md:p-6 w-[90%] md:w-[400px]">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 md:mb-6 bg-blue-50 -mx-4 md:-mx-6 -mt-4 md:-mt-6 p-4 rounded-t-2xl">
              Alterar Preços
            </h3>
            <div className="space-y-4 md:space-y-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
                <label className="font-medium">Português para Inglês U$:</label>
                <input
                  type="number"
                  name="pttoen"
                  value={priceInputs.pttoen}
                  onChange={handlePriceChange}
                  className="input-default w-full md:w-24 text-center"
                />
              </div>
              <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
                <label className="font-medium">Espanhol para Inglês U$:</label>
                <input
                  type="number"
                  name="esptoen"
                  value={priceInputs.esptoen}
                  onChange={handlePriceChange}
                  className="input-default w-full md:w-24 text-center"
                />
              </div>
            </div>
            <div className="flex flex-col md:flex-row justify-center gap-2 md:gap-4 mt-6 md:mt-8">
              <button
                onClick={handleSavePrices}
                className="btn bg-blue-50 hover:bg-blue-100 text-blue-600 border border-gray-200 rounded-full px-4 md:px-6 py-2"
              >
                Salvar
              </button>
              <button
                onClick={handleClosePriceModal}
                className="btn bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-full px-4 md:px-6 py-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showGlobalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-4 md:p-6 w-[90%] md:w-[400px]">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 md:mb-6 bg-blue-50 -mx-4 md:-mx-6 -mt-4 md:-mt-6 p-4 rounded-t-2xl">
              Alterar Valores Globais
            </h3>
            <div className="space-y-4 md:space-y-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
                <label className="font-medium">Português para Inglês U$:</label>
                <input
                  type="text"
                  name="pttoen"
                  value={globalTranslationRates.pttoen}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9,.]/g, "");
                    if ((value.match(/[,.]/g) || []).length > 1) return;
                    setGlobalTranslationRates((prev) => ({
                      ...prev,
                      pttoen: value,
                    }));
                  }}
                  className="input-default w-full md:w-24 text-center"
                />
              </div>
              <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
                <label className="font-medium">Espanhol para Inglês U$:</label>
                <input
                  type="text"
                  name="esptoen"
                  value={globalTranslationRates.esptoen}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9,.]/g, "");
                    if ((value.match(/[,.]/g) || []).length > 1) return;
                    setGlobalTranslationRates((prev) => ({
                      ...prev,
                      esptoen: value,
                    }));
                  }}
                  className="input-default w-full md:w-24 text-center"
                />
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Percentuais B2B:</h4>
                <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4 mb-2">
                  <label className="font-medium">Desconto no Tempo (%):</label>
                  <input
                    type="text"
                    name="b2bTimePercentage"
                    value={globalTranslationRates.b2bTimePercentage}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9,.]/g, "");
                      if ((value.match(/[,.]/g) || []).length > 1) return;
                      setGlobalTranslationRates((prev) => ({
                        ...prev,
                        b2bTimePercentage: value,
                      }));
                    }}
                    className="input-default w-full md:w-24 text-center"
                  />
                </div>
                <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
                  <label className="font-medium">Acréscimo no Preço (%):</label>
                  <input
                    type="text"
                    name="b2bPricePercentage"
                    value={globalTranslationRates.b2bPricePercentage}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9,.]/g, "");
                      if ((value.match(/[,.]/g) || []).length > 1) return;
                      setGlobalTranslationRates((prev) => ({
                        ...prev,
                        b2bPricePercentage: value,
                      }));
                    }}
                    className="input-default w-full md:w-24 text-center"
                  />
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Percentuais B2C:</h4>
                <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4 mb-2">
                  <label className="font-medium">Desconto no Tempo (%):</label>
                  <input
                    type="text"
                    name="b2cTimePercentage"
                    value={globalTranslationRates.b2cTimePercentage}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9,.]/g, "");
                      if ((value.match(/[,.]/g) || []).length > 1) return;
                      setGlobalTranslationRates((prev) => ({
                        ...prev,
                        b2cTimePercentage: value,
                      }));
                    }}
                    className="input-default w-full md:w-24 text-center"
                  />
                </div>
                <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
                  <label className="font-medium">Acréscimo no Preço (%):</label>
                  <input
                    type="text"
                    name="b2cPricePercentage"
                    value={globalTranslationRates.b2cPricePercentage}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9,.]/g, "");
                      if ((value.match(/[,.]/g) || []).length > 1) return;
                      setGlobalTranslationRates((prev) => ({
                        ...prev,
                        b2cPricePercentage: value,
                      }));
                    }}
                    className="input-default w-full md:w-24 text-center"
                  />
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
                <label className="font-medium">Valor na Home U$:</label>
                <input
                  type="text"
                  name="price_home"
                  value={globalTranslationRates.price_home}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9,.]/g, "");
                    if ((value.match(/[,.]/g) || []).length > 1) return;
                    setGlobalTranslationRates((prev) => ({
                      ...prev,
                      price_home: value,
                    }));
                  }}
                  className="input-default w-full md:w-24 text-center"
                />
              </div>
            </div>
            <div className="flex flex-col md:flex-row justify-center gap-2 md:gap-4 mt-6 md:mt-8">
              <button
                onClick={handleSaveGlobalRates}
                className="btn bg-blue-50 hover:bg-blue-100 text-blue-600 border border-gray-200 rounded-full px-4 md:px-6 py-2"
              >
                Salvar
              </button>
              <button
                onClick={handleCancelGlobalRates}
                className="btn bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-full px-4 md:px-6 py-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-4 md:p-6 w-[90%] md:w-[400px] text-center">
            <p className="text-gray-700 mb-4 md:mb-6">
              Deseja realizar essa alteração?
            </p>
            <div className="flex flex-col md:flex-row justify-center gap-2 md:gap-4">
              <button
                onClick={handleTypeChangeConfirm}
                className="btn bg-blue-50 hover:bg-blue-100 text-blue-600 border border-gray-200 rounded-full px-4 md:px-6 py-2"
              >
                Ok
              </button>
              <button
                onClick={handleTypeChangeCancel}
                className="btn bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-full px-4 md:px-6 py-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-4 md:p-6 w-[90%] md:w-[400px]">
            <div className="flex justify-between items-center mb-4 md:mb-6 bg-blue-50 -mx-4 md:-mx-6 -mt-4 md:-mt-6 p-4 rounded-t-2xl">
              <div className="w-6"></div>
              <h3 className="text-lg font-semibold text-gray-700 flex-1 text-center">
                Informação
              </h3>
            </div>
            <p className="text-gray-600 mb-4 md:mb-6">
              Este botão permite que parceiros de confiança possam aprovar o
              projeto que não tenha sido pago
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => setShowInfoModal(false)}
                className="btn bg-blue-50 hover:bg-blue-100 text-blue-600 border border-gray-200 rounded-full px-4 md:px-6 py-2"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterClient;
