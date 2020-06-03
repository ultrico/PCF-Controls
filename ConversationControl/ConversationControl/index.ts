import {IInputs, IOutputs} from "./generated/ManifestTypes";
import { senderEnum, openStrategyEnum } from "./helper/enums";
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Conversation } from './tsx/Conversation';
import DataSetInterfaces = ComponentFramework.PropertyHelper.DataSetApi;
import { IMessageProps } from "./tsx/Message";

type DataSet = ComponentFramework.PropertyTypes.DataSet;

const RowRecordId: string = "rowRecId";

declare var Xrm: any;

const DataSetControl_LoadMoreButton_Hidden_Style = "DataSetControl_LoadMoreButton_Hidden_Style";

export class ConversationControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {

	private _context: ComponentFramework.Context<IInputs>;
	private _randomId: string;
	private _openStrategy: openStrategyEnum;
	private _modalWidth: number;

	//Column variables
	private _textColumn: string;
	private _senderColumn: string;
	private _dateColumn: string;
	private _readColumn: string;
	private _publishedColumn: string;
	private _hasAttachmentColumn: string;
	private _customerIdentifyers: string[];

	// HTML container
	private _conversation: HTMLDivElement;

	// Button element created as part of this control
	private _loadPageButton: HTMLButtonElement;

	/**
	 * Empty constructor.
	 */
	constructor()
	{

	}

	/**
	 * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
	 * Data-set values are not initialized here, use updateView.
	 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
	 * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
	 * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
	 * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
	 */
	public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container:HTMLDivElement)
	{
		this._context = context;
		this._randomId = this.createId(7);

		this._textColumn = context.parameters.TextColumn.raw? context.parameters.TextColumn.raw : "";
		this._senderColumn = context.parameters.SenderColumn.raw? context.parameters.SenderColumn.raw : "";
		this._dateColumn = context.parameters.DateColumn.raw? context.parameters.DateColumn.raw : "";
		this._readColumn = context.parameters.ReadColumn.raw? context.parameters.ReadColumn.raw : "";
		this._publishedColumn = context.parameters.PublishedColumn.raw? context.parameters.PublishedColumn.raw : "";
		this._hasAttachmentColumn = context.parameters.HasAttachmentsColumn.raw? context.parameters.HasAttachmentsColumn.raw : "";
		this._customerIdentifyers = context.parameters.CustomerIdentifier.raw? context.parameters.CustomerIdentifier.raw.split(',') : [];

		let showScrollbar = false;
		if(context.parameters.ShowScrollbar!.raw == "Yes"){
			showScrollbar = true;
		}

		this._openStrategy = openStrategyEnum.ModalCenter;
		if(context.parameters.OpenStrategy!.raw == openStrategyEnum.CurrentTab){
			this._openStrategy = openStrategyEnum.CurrentTab;
		} else if(context.parameters.OpenStrategy!.raw == openStrategyEnum.NewWindow){
			this._openStrategy = openStrategyEnum.NewWindow;
		} else if(context.parameters.OpenStrategy!.raw == openStrategyEnum.ModalRight){
			this._openStrategy = openStrategyEnum.ModalRight;
		}

		this._modalWidth = context.parameters.ModalWidth.raw? context.parameters.ModalWidth.raw : 50;

		let messageSentBgColor = context.parameters.SentMessageBgColor.raw? context.parameters.SentMessageBgColor.raw : "#e1ffc7";
		let messageSentTextColor = context.parameters.SentMessageTextColor.raw? context.parameters.SentMessageTextColor.raw : "#000000";
		let messageSentMetadataTextColor = context.parameters.SentMessageMetadataTextColor.raw? context.parameters.SentMessageMetadataTextColor.raw : "#888888";
		let messageSentReadCheckmarkColor = context.parameters.SentMessageReadCheckmarkColor.raw? context.parameters.SentMessageReadCheckmarkColor.raw : "#4fc3f7";
		let messageSentUnpublishedBgColor = context.parameters.SentMessageNotPublishedBgColor.raw? context.parameters.SentMessageNotPublishedBgColor.raw : "#f1ffe4";
		let messageSentUnpublishedTextColor = context.parameters.SentMessageNotPublishedTextColor.raw? context.parameters.SentMessageNotPublishedTextColor.raw : "#000000";
		let messageSentUnpublishedMetadataTextColor = context.parameters.SentMessageNotPublishedMetaDataTextColor.raw? context.parameters.SentMessageNotPublishedMetaDataTextColor.raw : "#888888";
		let messageReceivedBgColor = context.parameters.ReceivedMessageBgColor.raw? context.parameters.ReceivedMessageBgColor.raw : "#eeeeee";
		let messageReceivedTextColor = context.parameters.ReceivedMessageTextColor.raw? context.parameters.ReceivedMessageTextColor.raw : "#000000";
		let messageReceivedMetadataTextColor = context.parameters.ReceivedMessageMetadataTextColor.raw? context.parameters.ReceivedMessageMetadataTextColor.raw : "#888888";
		let maxHeight = context.parameters.MaxHeight.raw? context.parameters.MaxHeight.raw : "";

		container.appendChild(this.generateCustomStyle(this._randomId, showScrollbar, maxHeight, messageSentBgColor, messageSentTextColor, messageSentMetadataTextColor, messageSentReadCheckmarkColor, messageSentUnpublishedBgColor, messageSentUnpublishedTextColor, messageSentUnpublishedMetadataTextColor, messageReceivedBgColor, messageReceivedTextColor, messageReceivedMetadataTextColor));
		
		this._conversation = document.createElement("div");
		container.appendChild(this._conversation);

		this._loadPageButton = document.createElement("button");
		this._loadPageButton.setAttribute("type", "button");
		this._loadPageButton.innerText = context.resources.getString("LoadMore_ButtonLabel");
		this._loadPageButton.classList.add(DataSetControl_LoadMoreButton_Hidden_Style);
		this._loadPageButton.classList.add("DataSetControl_LoadMoreButton_Style");
		this._loadPageButton.addEventListener(
		  "click",
		  this.onLoadMoreButtonClick.bind(this)
		);
		
		container.appendChild(this._loadPageButton);
	}


	/**
	 * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
	 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
	 */
	public updateView(context: ComponentFramework.Context<IInputs>): void
	{
		this._context = context;
		this.toggleLoadMoreButtonWhenNeeded(context.parameters.dataSetGrid);
		if(!context.parameters.dataSetGrid.loading){

			if (!context.parameters.dataSetGrid.columns || !context.parameters.dataSetGrid.columns.some(function(columnItem: DataSetInterfaces.Column) { return columnItem.order >= 0})) {
				return;
			}

			ReactDOM.render(
				React.createElement(
					Conversation,
					{
						messages: this.generateMessageArray(context.parameters.dataSetGrid),
						randomId: this._randomId,
						noRecordsText: this._context.resources.getString("No_Record_Found"),
						onClick: this.onMessageClick.bind(this)
					}
				),
				this._conversation
			);
		}
	}

	/** 
	 * It is called by the framework prior to a control receiving new data. 
	 * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
	 */
	public getOutputs(): IOutputs
	{
		return {};
	}

	/** 
	 * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
	 * i.e. cancelling any pending remote calls, removing listeners, etc.
	 */
	public destroy(): void
	{
		this._loadPageButton.removeEventListener("click",this.onLoadMoreButtonClick);
	}

	/**
   * Row Click Event handler for the associated row when being clicked
   */
  	private onMessageClick(rowRecordId: string): void {
		if (rowRecordId) {
			let entityLogicalName = this._context.parameters.dataSetGrid.getTargetEntityType();

			if((this._openStrategy === openStrategyEnum.ModalCenter || this._openStrategy === openStrategyEnum.ModalRight) && typeof Xrm !== 'undefined'){
				let pageInput = {
					pageType: "entityrecord",
					entityName: entityLogicalName,
					formType: 2,
					entityId: rowRecordId
				};

				let navigationOptions = {
					target: 2,
					position: (this._openStrategy === openStrategyEnum.ModalRight? 2 : 1),
					width: {value: this._modalWidth, unit:"%"}
				};		
				
				(<any>Xrm).Navigation.navigateTo(pageInput, navigationOptions);
			} else{
				let entityFormOptions = {
					entityName: entityLogicalName,
					entityId: rowRecordId,
					openInNewWindow: (this._openStrategy === openStrategyEnum.NewWindow)
				};
				this._context.navigation.openForm(entityFormOptions);
			}
		}
	}

	private generateMessageArray(messages: DataSet): IMessageProps[]{
		let messagesArray: IMessageProps[] = [];

		if(messages.sortedRecordIds.length > 0)
		{
			for(let currentRecordId of messages.sortedRecordIds){
				let recordId = messages.records[currentRecordId].getRecordId();
				let text = messages.records[currentRecordId].getFormattedValue(this._textColumn);
				let sender = (this._customerIdentifyers.includes(messages.records[currentRecordId].getValue(this._senderColumn).toString()))? senderEnum.Customer : senderEnum.User;
				let createDate = (typeof this._dateColumn !== 'undefined' && this._dateColumn !== "") ? messages.records[currentRecordId].getFormattedValue(this._dateColumn) : "";
				let hasAttachments = (typeof this._hasAttachmentColumn !== 'undefined' && this._hasAttachmentColumn !== "" && messages.records[currentRecordId].getValue(this._hasAttachmentColumn) === "1")? true : false;

				let read = false;
				if(typeof this._readColumn === 'undefined' ||
				  this._readColumn === "" || 
				  (this._readColumn !== "" && messages.records[currentRecordId].getValue(this._readColumn) !== null)){
					read = true;
				}

				let published = false;
				if(typeof this._publishedColumn === 'undefined' ||
				  this._publishedColumn === "" || 
				  (this._publishedColumn !== "" && messages.records[currentRecordId].getValue(this._publishedColumn) !== null)){
					published = true;
				}

				messagesArray.push({recordId: recordId, text: text, sender: sender, published: published, createDate: createDate, read: read, hasAttachments: hasAttachments});
			}
		}

		return messagesArray;
	}
	
	private generateCustomStyle(controlId: string, showScrollbar: boolean, maxHeight: string, messageSentBgColor: string, messageSentTextColor: string, messageSentMetadataTextColor: string, messageSentReadCheckmarkColor: string, messageSentUnpublishedBgColor: string, messageSentUnpublishedTextColor: string, messageSentUnpublishedMetadataTextColor:string, messageReceivedBgColor: string, messageReceivedTextColor: string, messageReceivedMetadataTextColor: string) : HTMLStyleElement{
		let style = document.createElement("style");

		if(showScrollbar){
			style.innerHTML = "div.BeBeControls div#" + controlId + ".conversation { overflow-y: scroll; }";
		} else if(maxHeight && maxHeight !== "" && maxHeight !== null) {
			style.innerHTML = "div.BeBeControls div#" + controlId + ".conversation { max-height: " + maxHeight + "; }";
		}

		style.innerHTML += " div.BeBeControls div#" + controlId + ".conversation .message.sent.published { color: " + messageSentTextColor + "; }";

		style.innerHTML += " div.BeBeControls div#" + controlId + ".conversation .message.sent.published .metadata { color: " + messageSentMetadataTextColor +"; }";

		style.innerHTML += " div.BeBeControls div#" + controlId + ".conversation .message.sent.published { background: " + messageSentBgColor + "; }";

		style.innerHTML += " div.BeBeControls div#" + controlId + ".conversation .message.sent.published:after { border-color: transparent transparent transparent " + messageSentBgColor + "; }";

		style.innerHTML += " div.BeBeControls div#" + controlId + ".conversation .message.sent.notPublished { color: " + messageSentUnpublishedTextColor + "; }";

		style.innerHTML += " div.BeBeControls div#" + controlId + ".conversation .message.sent.notPublished .metadata { color: " + messageSentUnpublishedMetadataTextColor +"; }";

		style.innerHTML += " div.BeBeControls div#" + controlId + ".conversation .message.sent.notPublished { background: " + messageSentUnpublishedBgColor + "; }";

		style.innerHTML += " div.BeBeControls div#" + controlId + ".conversation .message.sent.notPublished:after { border-color: transparent transparent transparent " + messageSentUnpublishedBgColor + "; }";

		style.innerHTML += " div.BeBeControls div#" + controlId + ".conversation .message.sent.read .metadata .checkmarks{ color:" + messageSentReadCheckmarkColor + "; }";
		
		style.innerHTML += " div.BeBeControls div#" + controlId + ".conversation .message.received { background: " + messageReceivedBgColor + "; color: " + messageReceivedTextColor +"; }";

		style.innerHTML += " div.BeBeControls div#" + controlId + ".conversation .message.received .metadata { color: " + messageReceivedMetadataTextColor +"; }";
		
		style.innerHTML += " div.BeBeControls div#" + controlId + ".conversation .message.received:after { border-color: transparent " + messageReceivedBgColor + " transparent transparent; }";

		return style;
	}

	private createId(length: number) {
		let result = '';
		let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
		let charactersLength = characters.length;
		for ( let i = 0; i < length; i++ ) {
		   result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}
		return result;
	 }

	  /**
	 * 'LoadMore' Button Event handler when load more button clicks
	 * @param event
	 */
	private onLoadMoreButtonClick(event: Event): void {
		this._context.parameters.dataSetGrid.paging.loadNextPage();
		this.toggleLoadMoreButtonWhenNeeded(this._context.parameters.dataSetGrid);
	}

	 /**
	 * Toggle 'LoadMore' button when needed
	 */
	private toggleLoadMoreButtonWhenNeeded(gridParam: DataSet): void {
		if (
			gridParam.paging.hasNextPage &&
			this._loadPageButton.classList.contains(
				DataSetControl_LoadMoreButton_Hidden_Style
			)
		) {
			this._loadPageButton.classList.remove(
				DataSetControl_LoadMoreButton_Hidden_Style
			);
		} else if (
			!gridParam.paging.hasNextPage &&
			!this._loadPageButton.classList.contains(
				DataSetControl_LoadMoreButton_Hidden_Style
			)
		) {
			this._loadPageButton.classList.add(
				DataSetControl_LoadMoreButton_Hidden_Style
			);
		}
	}
}