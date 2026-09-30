import type { ICmsProductionProps } from '../../components/ICmsProductionProps';
import SPCRUDOPS from "../DAL/spcrudops";

export interface ICMSMasterItem {
  Id: number | null;

  Title: string;

  EWODetails: string;
  PartAction: string;
  ActionTaken: string;

  Stage: number | null;
  Status: string;

  WF: string;
  Summary: string;
  Ageing: string;

  PreBP: string;
  PostBP: string;
  PrePostBPAgeing: string;

  ToDoStatus: string;

  AutoGenerateFromEWO: number | null;

  Created: string | null;
  Modified: string | null;

  CreatedBy: string;
  CreatedById: number | null;

  ModifiedBy: string;
  ModifiedById: number | null;
}

export interface ICMSMasterPayload {
  Title?: string;

  EWODetails?: string;
  PartAction?: string;
  ActionTaken?: string;

  Stage?: number;
  Status?: string;

  WF?: string;
  Summary?: string;
  Ageing?: string;

  PreBP?: string;
  PostBP?: string;
  PrePostBPAgeing?: string;

  ToDoStatus?: string;

  AutoGenerateFromEWO?: number;
}

export interface ICMSMasterOps {
  getCMSMasterData(
    filter: string,
    orderby: { column: string; isAscending: boolean },
    props: ICmsProductionProps,
  ): Promise<ICMSMasterItem[]>;

  getCMSMasterById(
    id: number,
    props: ICmsProductionProps,
  ): Promise<ICMSMasterItem | null>;

  getCMSMasterByEWONo(
    ewono: string,
    props: ICmsProductionProps,
  ): Promise<ICMSMasterItem | null>;

  createCMSMaster(
    payload: ICMSMasterPayload,
    props: ICmsProductionProps,
  ): Promise<any>;

  updateCMSMaster(
    id: number,
    payload: ICMSMasterPayload,
    props: ICmsProductionProps,
  ): Promise<any>;

  deleteCMSMaster(id: number, props: ICmsProductionProps): Promise<any>;
}

export default function CMSMasterOps(): ICMSMasterOps {
  const spCrudOps = SPCRUDOPS();

  const getCMSMasterData = async (
    filter: string,
    orderby: { column: string; isAscending: boolean },
    props: ICmsProductionProps,
  ): Promise<ICMSMasterItem[]> => {
    try {
      const spCrudOpsInstance = await spCrudOps;

      const results = await spCrudOpsInstance.getData(
        "CMS_List",

        `*,
        Author/Id,
        Author/Title,
        Editor/Id,
        Editor/Title`,

        `Author,
        Editor`,

        filter,
        orderby,
        props,
      );

      const mapped = results.map((item: any) => ({
        Id: item.Id ?? null,

        Title: item.Title ?? "",

        EWODetails: item.EWODetails ?? "",
        PartAction: item.PartAction ?? "",
        ActionTaken: item.ActionTaken ?? "",

        Stage: item.Stage ?? null,
        Status: item.Status ?? "",

        WF: item.WF ?? "",
        Summary: item.Summary ?? "",
        Ageing: item.Ageing ?? "",

        PreBP: item.PreBP ?? "",
        PostBP: item.PostBP ?? "",
        PrePostBPAgeing: item.PrePostBPAgeing ?? "",

        ToDoStatus: item.ToDoStatus ?? "",

        AutoGenerateFromEWO: item.AutoGenerateFromEWO ?? null,

        Created: item.Created ?? null,
        Modified: item.Modified ?? null,

        CreatedBy: item.Author?.Title ?? "",
        CreatedById: item.Author?.Id ?? null,

        ModifiedBy: item.Editor?.Title ?? "",
        ModifiedById: item.Editor?.Id ?? null,
      }));

      return mapped;
    } catch (error) {
      console.error("Error fetching CMSMaster data:", error);
      throw error;
    }
  };

  const getCMSMasterById = async (
    id: number,
    props: ICmsProductionProps,
  ): Promise<ICMSMasterItem | null> => {
    try {
      const data = await getCMSMasterData(
        `Id eq ${id}`,
        {
          column: "Id",
          isAscending: false,
        },
        props,
      );

      return data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error("Error fetching CMSMaster by Id:", error);
      throw error;
    }
  };

  const getCMSMasterByEWONo = async (
    ewono: string,
    props: ICmsProductionProps,
  ): Promise<ICMSMasterItem | null> => {
    try {
      const data = await getCMSMasterData(
        `Title eq '${ewono}'`,
        {
          column: "Id",
          isAscending: false,
        },
        props,
      );

      return data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error("Error fetching CMSMaster by EWO No:", error);
      throw error;
    }
  };

  const createCMSMaster = async (
    payload: ICMSMasterPayload,
    props: ICmsProductionProps,
  ): Promise<any> => {
    try {
      const spCrudOpsInstance = await spCrudOps;

      return await spCrudOpsInstance.insertData("CMS_List", payload, props);
    } catch (error) {
      console.error("Error creating CMSMaster:", error);
      throw error;
    }
  };

  const updateCMSMaster = async (
    id: number,
    payload: ICMSMasterPayload,
    props: ICmsProductionProps,
  ): Promise<any> => {
    try {
      const spCrudOpsInstance = await spCrudOps;

      return await spCrudOpsInstance.updateData(
        "CMS_List",
        id,
        payload,
        props,
      );
    } catch (error) {
      console.error("Error updating CMSMaster:", error);
      throw error;
    }
  };

  const deleteCMSMaster = async (
    id: number,
    props: ICmsProductionProps,
  ): Promise<any> => {
    try {
      const spCrudOpsInstance = await spCrudOps;

      return await spCrudOpsInstance.deleteData("CMS_List", id, props);
    } catch (error) {
      console.error("Error deleting CMSMaster:", error);
      throw error;
    }
  };

  return {
    getCMSMasterData,
    getCMSMasterById,
    getCMSMasterByEWONo,
    createCMSMaster,
    updateCMSMaster,
    deleteCMSMaster,
  };
}